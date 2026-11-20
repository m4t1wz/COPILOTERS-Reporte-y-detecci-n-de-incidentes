"""Máquina de estados, auditoría y persistencia de reportes
(docs/03. backend.md §4.4; docs/02. system-contracts.md §4-§6; docs/06. database-storage.md §3-§4)."""
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Awaitable, Callable
from uuid import UUID

import asyncpg

from core.exceptions import (
    InvalidStateTransitionException,
    ReportNotFoundException,
    ValidationErrorException,
)
from schemas.auth import UserProfile
from schemas.common import (
    CATEGORY_COLORS,
    CATEGORY_LABELS,
    STATUS_LABELS,
    Pagination,
    ReportStatus,
    format_report_number,
)
from schemas.incident import IncidentDetail, IncidentFeature, IncidentFeatureCollection
from schemas.report import (
    AdminReportItem,
    AdminReportsPage,
    ChangedBy,
    CitizenInfo,
    DashboardStats,
    HistoryItem,
    Location,
    LocationWithDisplay,
    MyReportDetail,
    MyReportItem,
    MyReportsPage,
    OperatorInfo,
    ReportConfirmation,
    ReportConfirmationResponse,
    ReportHistoryResponse,
    StatusUpdateResponse,
    TimelineItem,
)

# --- Máquina de estados (02 §6; 03 §4.4) ---
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pendiente": {"en_revision", "descartado"},
    "en_revision": {"verificado", "descartado"},
    "verificado": {"en_seguimiento", "resuelto", "descartado"},
    "en_seguimiento": {"resuelto", "descartado"},
    "resuelto": set(),
    "descartado": set(),
}

COMMENT_REQUIRED_STATUSES = {"en_revision", "en_seguimiento", "descartado"}

# Estados activos por defecto del mapa público (02 §4).
ACTIVE_STATUSES = ["pendiente", "en_revision", "verificado", "en_seguimiento"]

# Textos del timeline (02 §5; PROJECT_CONTEXT §1.D y §2).
# DOC-PENDIENTE: solo "pendiente" y "en_revision" tienen título/descripción literal en el contrato; el resto
# usa la etiqueta del estado y la descripción del flujo de PROJECT_CONTEXT §2 / 02 §2.1.
TIMELINE_TEXT: dict[str, tuple[str, str]] = {
    "pendiente": ("Reporte recibido", "El aviso fue recibido."),
    "en_revision": ("En revisión", "Se está revisando el reporte."),
    "verificado": ("Verificado", "Se confirmó el incidente."),
    "descartado": ("Descartado", "El aviso no corresponde a un incidente o no se pudo confirmar."),
    "en_seguimiento": ("En seguimiento", "Se está realizando gestiones sobre el incidente."),
    "resuelto": ("Resuelto", "El incidente fue atendido y la situación quedó subsanada."),
}

CONFIRMATION_STATUS_MESSAGE = "El aviso fue recibido."

# DOC-PENDIENTE: 01 §8.2 exige "coordenadas aproximadas" en la API pública sin fijar precisión; se
# redondea a 4 decimales (precisión del ejemplo del contrato).
PUBLIC_COORDINATE_DECIMALS = 4


def validate_transition(current_status: str, new_status: str) -> None:
    if new_status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise InvalidStateTransitionException(
            f"No se permite la transición de '{current_status}' a '{new_status}'.",
            {
                "current_status": current_status,
                "requested_status": new_status,
                "allowed_transitions": sorted(ALLOWED_TRANSITIONS.get(current_status, set())),
            },
        )


def validate_admin_comment(new_status: str, admin_comment: str | None) -> None:
    if new_status in COMMENT_REQUIRED_STATUSES and not (admin_comment and admin_comment.strip()):
        raise ValidationErrorException(
            f"El comentario administrativo es obligatorio para el estado '{new_status}'.",
            {"field": "admin_comment", "new_status": new_status},
        )


def affects_clusters(previous_status: str, new_status: str) -> bool:
    # 01 §9.3: recálculo al pasar a verificado/en_seguimiento.
    # DOC-PENDIENTE: también se recalcula al salir de esos estados para no mostrar zonas obsoletas.
    cluster_states = {"verificado", "en_seguimiento"}
    return new_status in cluster_states or previous_status in cluster_states


# --- Constructores de respuestas ---
def _location(row: dict, decimals: int | None = None) -> Location:
    lat, lon = row["latitude"], row["longitude"]
    if decimals is not None:
        lat, lon = round(lat, decimals), round(lon, decimals)
    return Location(latitude=lat, longitude=lon, address_reference=row["address_reference"])


def build_confirmation(row: dict) -> ReportConfirmationResponse:
    return ReportConfirmationResponse(
        confirmation=ReportConfirmation(
            report_id=row["id"],
            report_number=format_report_number(row["report_number"]),
            category=row["category"],
            category_label=CATEGORY_LABELS[row["category"]],
            location=_location(row),
            created_at=row["created_at"],
            status=row["current_status"],
            status_label=STATUS_LABELS[row["current_status"]],
            status_message=CONFIRMATION_STATUS_MESSAGE,
            photo_url=row["photo_url"],
        )
    )


def build_incident_feature(row: dict) -> IncidentFeature:
    lat = round(row["latitude"], PUBLIC_COORDINATE_DECIMALS)
    lon = round(row["longitude"], PUBLIC_COORDINATE_DECIMALS)
    return IncidentFeature(
        id=row["id"],
        geometry={"type": "Point", "coordinates": (lon, lat)},
        properties={
            "report_id": row["id"],
            "report_number": format_report_number(row["report_number"]),
            "category": row["category"],
            "category_label": CATEGORY_LABELS[row["category"]],
            "color": CATEGORY_COLORS[row["category"]],
            "status": row["current_status"],
            "status_label": STATUS_LABELS[row["current_status"]],
            "address_reference": row["address_reference"],
            "photo_url": row["photo_url"],
            "has_photo": bool(row["photo_url"]),
            "created_at": row["created_at"],
        },
    )


def build_incident_collection(rows: list[dict]) -> IncidentFeatureCollection:
    return IncidentFeatureCollection(features=[build_incident_feature(r) for r in rows])


def build_incident_detail(row: dict) -> IncidentDetail:
    return IncidentDetail(
        id=row["id"],
        report_number=format_report_number(row["report_number"]),
        category=row["category"],
        category_label=CATEGORY_LABELS[row["category"]],
        color=CATEGORY_COLORS[row["category"]],
        status=row["current_status"],
        status_label=STATUS_LABELS[row["current_status"]],
        location=_location(row, PUBLIC_COORDINATE_DECIMALS),
        photo_url=row["photo_url"],
        created_at=row["created_at"],
    )


def build_my_report_item(row: dict) -> MyReportItem:
    return MyReportItem(
        id=row["id"],
        report_number=format_report_number(row["report_number"]),
        category=row["category"],
        category_label=CATEGORY_LABELS[row["category"]],
        color=CATEGORY_COLORS[row["category"]],
        photo_url=row["photo_url"],
        location=_location(row),
        created_at=row["created_at"],
        current_status=row["current_status"],
        current_status_label=STATUS_LABELS[row["current_status"]],
    )


def build_timeline(history: list[dict]) -> list[TimelineItem]:
    ordered = sorted(history, key=lambda h: h["created_at"])
    items = []
    for index, entry in enumerate(ordered, start=1):
        title, description = TIMELINE_TEXT[entry["new_status"]]
        items.append(
            TimelineItem(
                step_order=index,
                status=entry["new_status"],
                title=title,
                description=description,
                admin_comment=entry["admin_comment"],
                timestamp=entry["created_at"],
            )
        )
    return items


def build_my_report_detail(row: dict, history: list[dict]) -> MyReportDetail:
    location = _location(row)
    return MyReportDetail(
        id=row["id"],
        report_number=format_report_number(row["report_number"]),
        category=row["category"],
        category_label=CATEGORY_LABELS[row["category"]],
        color=CATEGORY_COLORS[row["category"]],
        photo_url=row["photo_url"],
        comment=row["comment"],
        location=LocationWithDisplay(
            **location.model_dump(),
            display_text=f"{location.address_reference} ({location.latitude}, {location.longitude})",
        ),
        current_status=row["current_status"],
        current_status_label=STATUS_LABELS[row["current_status"]],
        timeline=build_timeline(history),
    )


def build_admin_report_item(row: dict) -> AdminReportItem:
    return AdminReportItem(
        id=row["id"],
        report_number=format_report_number(row["report_number"]),
        category=row["category"],
        category_label=CATEGORY_LABELS[row["category"]],
        created_at=row["created_at"],
        location=_location(row),
        photo_url=row["photo_url"],
        citizen_comment=row["comment"],
        current_status=row["current_status"],
        citizen=CitizenInfo(
            id=row["citizen_id"],
            full_name=row["citizen_full_name"],
            phone_number=row["citizen_phone_number"],
        ),
    )


def build_history_response(row: dict, history: list[dict]) -> ReportHistoryResponse:
    ordered = sorted(history, key=lambda h: h["created_at"])
    return ReportHistoryResponse(
        report_id=row["id"],
        report_number=format_report_number(row["report_number"]),
        history=[
            HistoryItem(
                id=h["id"],
                previous_status=h["previous_status"],
                new_status=h["new_status"],
                admin_comment=h["admin_comment"],
                changed_by=ChangedBy(user_id=h["changed_by"], role=h["changed_by_role"], name=h["changed_by_name"]),
                created_at=h["created_at"],
            )
            for h in ordered
        ],
    )


def build_dashboard_stats(counts: dict[str, int], active_clusters: int, now: datetime) -> DashboardStats:
    return DashboardStats(
        total_reports=sum(counts.values()),
        pending_reports=counts.get("pendiente", 0),
        in_review_reports=counts.get("en_revision", 0),
        verified_reports=counts.get("verificado", 0),
        in_progress_reports=counts.get("en_seguimiento", 0),
        resolved_reports=counts.get("resuelto", 0),
        discarded_reports=counts.get("descartado", 0),
        active_clusters_count=active_clusters,
        last_updated=now,
    )


# --- Filtros ---
@dataclass
class IncidentFilters:
    statuses: list[str]
    category: str | None = None
    bbox: tuple[float, float, float, float] | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


@dataclass
class AdminReportFilters:
    status: str | None = None
    category: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    search: str | None = None


# --- Repositorio PostgreSQL / PostGIS (asyncpg) ---
# La base real usa nombres en español (06 §7). Los alias devuelven las claves en inglés
# que usan los constructores de respuesta y el contrato 02.
_REPORT_COLUMNS = (
    "r.id, r.numero_reporte AS report_number, r.id_ciudadano AS citizen_id, r.categoria AS category, "
    "r.comentario AS comment, r.url_foto AS photo_url, r.latitud AS latitude, r.longitud AS longitude, "
    "r.referencia_direccion AS address_reference, r.estado_actual AS current_status, "
    "r.creado_en AS created_at, r.actualizado_en AS updated_at"
)

# Rol en la base (ciudadano/administrador) → rol del contrato 02 (citizen/admin).
_ROLE_SQL = "CASE p.rol WHEN 'administrador' THEN 'admin' ELSE 'citizen' END"


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class ReportRepository:
    def __init__(self, pool_provider: Callable[[], Awaitable[asyncpg.Pool]]):
        # El pool se obtiene en la primera consulta: las solicitudes rechazadas por validación o
        # autenticación no requieren conexión a la base de datos.
        self._pool_provider = pool_provider

    async def _get_pool(self) -> asyncpg.Pool:
        return await self._pool_provider()

    async def get_profile(self, user_id: UUID) -> dict | None:
        row = await (await self._get_pool()).fetchrow(
            f"SELECT p.id, p.correo AS email, p.nombre_completo AS full_name, p.telefono AS phone_number, "
            f"{_ROLE_SQL} AS role FROM public.perfiles p WHERE p.id = $1",
            user_id,
        )
        return dict(row) if row else None

    async def create_report(
        self,
        *,
        report_id: UUID,
        citizen_id: UUID,
        category: str,
        comment: str | None,
        photo_url: str | None,
        latitude: float,
        longitude: float,
        address_reference: str,
    ) -> dict:
        async with (await self._get_pool()).acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    f"""
                    INSERT INTO public.reportes AS r
                        (id, id_ciudadano, categoria, comentario, url_foto, latitud, longitud,
                         referencia_direccion, geometria, estado_actual)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                            ST_SetSRID(ST_MakePoint($7, $6), 4326), 'pendiente')
                    RETURNING {_REPORT_COLUMNS}
                    """,
                    report_id, citizen_id, category, comment, photo_url, latitude, longitude, address_reference,
                )
                await conn.execute(
                    """
                    INSERT INTO public.historial_reportes
                        (id_reporte, estado_anterior, estado_nuevo, modificado_por, comentario_admin, creado_en)
                    VALUES ($1, NULL, 'pendiente', $2, NULL, $3)
                    """,
                    report_id, citizen_id, row["created_at"],
                )
        return dict(row)

    async def get_report(self, report_id: UUID) -> dict | None:
        row = await (await self._get_pool()).fetchrow(f"SELECT {_REPORT_COLUMNS} FROM public.reportes r WHERE r.id = $1", report_id)
        return dict(row) if row else None

    async def list_incidents(self, filters: IncidentFilters) -> list[dict]:
        conditions = ["r.estado_actual = ANY($1::text[])"]
        params: list[Any] = [filters.statuses]
        if filters.category:
            params.append(filters.category)
            conditions.append(f"r.categoria = ${len(params)}")
        if filters.bbox:
            params.extend(filters.bbox)
            n = len(params)
            conditions.append(f"r.geometria && ST_MakeEnvelope(${n - 3}, ${n - 2}, ${n - 1}, ${n}, 4326)")
        if filters.start_date:
            params.append(filters.start_date)
            conditions.append(f"r.creado_en >= ${len(params)}")
        if filters.end_date:
            params.append(filters.end_date)
            conditions.append(f"r.creado_en <= ${len(params)}")
        rows = await (await self._get_pool()).fetch(
            f"SELECT {_REPORT_COLUMNS} FROM public.reportes r WHERE {' AND '.join(conditions)} "
            "ORDER BY r.creado_en DESC",
            *params,
        )
        return [dict(r) for r in rows]

    async def list_citizen_reports(self, citizen_id: UUID, page: int, page_size: int) -> tuple[list[dict], int]:
        total = await (await self._get_pool()).fetchval("SELECT count(*) FROM public.reportes WHERE id_ciudadano = $1", citizen_id)
        rows = await (await self._get_pool()).fetch(
            f"SELECT {_REPORT_COLUMNS} FROM public.reportes r WHERE r.id_ciudadano = $1 "
            "ORDER BY r.creado_en DESC LIMIT $2 OFFSET $3",
            citizen_id, page_size, (page - 1) * page_size,
        )
        return [dict(r) for r in rows], total

    async def list_admin_reports(
        self, filters: AdminReportFilters, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        conditions: list[str] = []
        params: list[Any] = []
        if filters.status:
            params.append(filters.status)
            conditions.append(f"r.estado_actual = ${len(params)}")
        if filters.category:
            params.append(filters.category)
            conditions.append(f"r.categoria = ${len(params)}")
        if filters.start_date:
            params.append(filters.start_date)
            conditions.append(f"r.creado_en >= ${len(params)}")
        if filters.end_date:
            params.append(filters.end_date)
            conditions.append(f"r.creado_en <= ${len(params)}")
        if filters.search:
            params.append(f"%{_escape_like(filters.search)}%")
            n = len(params)
            # El panel busca también por número (INT-02, D1): "#00142", "00142" o "142".
            conditions.append(
                f"(r.comentario ILIKE ${n} OR r.referencia_direccion ILIKE ${n} "
                f"OR ('#' || lpad(r.numero_reporte::text, 5, '0')) ILIKE ${n})"
            )
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        total = await (await self._get_pool()).fetchval(f"SELECT count(*) FROM public.reportes r {where}", *params)
        # DOC-PENDIENTE: orden no definido en el contrato; más recientes primero.
        rows = await (await self._get_pool()).fetch(
            f"""
            SELECT {_REPORT_COLUMNS}, p.nombre_completo AS citizen_full_name, p.telefono AS citizen_phone_number
            FROM public.reportes r JOIN public.perfiles p ON p.id = r.id_ciudadano
            {where}
            ORDER BY r.creado_en DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
            """,
            *params, page_size, (page - 1) * page_size,
        )
        return [dict(r) for r in rows], total

    async def count_by_status(self) -> dict[str, int]:
        rows = await (await self._get_pool()).fetch(
            "SELECT estado_actual AS current_status, count(*) AS total FROM public.reportes GROUP BY estado_actual"
        )
        return {r["current_status"]: r["total"] for r in rows}

    async def get_history(self, report_id: UUID) -> list[dict]:
        rows = await (await self._get_pool()).fetch(
            f"""
            SELECT h.id, h.id_reporte AS report_id, h.estado_anterior AS previous_status, h.estado_nuevo AS new_status,
                   h.modificado_por AS changed_by, h.comentario_admin AS admin_comment, h.creado_en AS created_at,
                   {_ROLE_SQL} AS changed_by_role, p.nombre_completo AS changed_by_name
            FROM public.historial_reportes h JOIN public.perfiles p ON p.id = h.modificado_por
            WHERE h.id_reporte = $1
            ORDER BY h.creado_en ASC
            """,
            report_id,
        )
        return [dict(r) for r in rows]

    async def change_status(
        self, *, report_id: UUID, expected_status: str, new_status: str, changed_by: UUID, admin_comment: str | None
    ) -> dict | None:
        """UPDATE + INSERT inmutable en historial_reportes dentro de una transacción (03 §4.4 regla 1).

        Devuelve None si el estado actual ya no es `expected_status` (modificación concurrente).
        """
        async with (await self._get_pool()).acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    f"""
                    UPDATE public.reportes AS r SET estado_actual = $2, actualizado_en = now()
                    WHERE r.id = $1 AND r.estado_actual = $3
                    RETURNING {_REPORT_COLUMNS}
                    """,
                    report_id, new_status, expected_status,
                )
                if row is None:
                    return None
                await conn.execute(
                    """
                    INSERT INTO public.historial_reportes
                        (id_reporte, estado_anterior, estado_nuevo, modificado_por, comentario_admin, creado_en)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    report_id, expected_status, new_status, changed_by, admin_comment, row["updated_at"],
                )
        return dict(row)


    # --- Notificaciones push (DEP-00): configuracion_usuario.notificaciones_push_activas / token_push ---
    async def set_notification_settings(self, user_id: UUID, enabled: bool, push_token: str | None) -> dict:
        """Guarda la preferencia y el token del teléfono. Un token pertenece a un solo usuario: si el teléfono
        cambió de cuenta, se quita del usuario anterior."""
        token = push_token if enabled else None
        async with (await self._get_pool()).acquire() as conn:
            async with conn.transaction():
                if token:
                    await conn.execute(
                        "UPDATE public.configuracion_usuario SET token_push = NULL, actualizado_en = now() "
                        "WHERE token_push = $1 AND id_usuario <> $2",
                        token, user_id,
                    )
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.configuracion_usuario (id_usuario, notificaciones_push_activas, token_push)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (id_usuario) DO UPDATE
                        SET notificaciones_push_activas = EXCLUDED.notificaciones_push_activas,
                            token_push = EXCLUDED.token_push,
                            actualizado_en = now()
                    RETURNING notificaciones_push_activas AS enabled, token_push AS push_token
                    """,
                    user_id, enabled, token,
                )
        return dict(row)

    async def get_notification_target(self, user_id: UUID) -> dict | None:
        row = await (await self._get_pool()).fetchrow(
            "SELECT notificaciones_push_activas AS enabled, token_push AS push_token "
            "FROM public.configuracion_usuario WHERE id_usuario = $1",
            user_id,
        )
        return dict(row) if row else None

    async def clear_push_token(self, push_token: str) -> None:
        await (await self._get_pool()).execute(
            "UPDATE public.configuracion_usuario SET token_push = NULL, actualizado_en = now() WHERE token_push = $1",
            push_token,
        )

def get_report_repository() -> ReportRepository:
    from database import get_db_pool

    return ReportRepository(get_db_pool)


# --- Casos de uso ---
async def change_report_status(
    repo: ReportRepository,
    report_id: UUID,
    new_status: ReportStatus,
    admin_comment: str | None,
    operator: UserProfile,
) -> tuple[StatusUpdateResponse, str]:
    """Aplica la FSM y registra la auditoría. Devuelve la respuesta y el estado anterior."""
    report = await repo.get_report(report_id)
    if report is None:
        raise ReportNotFoundException(details={"report_id": str(report_id)})
    previous = report["current_status"]
    validate_transition(previous, new_status.value)
    validate_admin_comment(new_status.value, admin_comment)
    updated = await repo.change_status(
        report_id=report_id,
        expected_status=previous,
        new_status=new_status.value,
        changed_by=operator.id,
        admin_comment=admin_comment,
    )
    if updated is None:
        raise InvalidStateTransitionException(
            "El reporte fue modificado por otro operador. Vuelva a consultarlo.",
            {"report_id": str(report_id)},
        )
    response = StatusUpdateResponse(
        report_id=updated["id"],
        report_number=format_report_number(updated["report_number"]),
        previous_status=previous,
        current_status=updated["current_status"],
        admin_comment=admin_comment,
        updated_at=updated["updated_at"],
        operator=OperatorInfo(id=operator.id, full_name=operator.full_name),
    )
    return response, previous


def build_my_reports_page(rows: list[dict], total: int, page: int, page_size: int) -> MyReportsPage:
    return MyReportsPage(items=[build_my_report_item(r) for r in rows], pagination=Pagination.build(page, page_size, total))


def build_admin_reports_page(rows: list[dict], total: int, page: int, page_size: int) -> AdminReportsPage:
    return AdminReportsPage(
        items=[build_admin_report_item(r) for r in rows], pagination=Pagination.build(page, page_size, total)
    )
