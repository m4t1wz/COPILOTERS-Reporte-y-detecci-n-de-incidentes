"""Borrado de datos para pruebas, solo para administradores y con ENABLE_DATA_RESET=true (03 §4.7).

Alcances:
- "agrupaciones": borra las zonas de concentración (se regeneran al verificar reportes).
- "reportes": borra todos los reportes, su historial, sus fotos y las zonas; reinicia la numeración.
- "cuentas": borra todas las cuentas salvo la del administrador que ejecuta la acción, junto con sus reportes
  (la base no permite reportes sin ciudadano) y el historial que esos usuarios registraron; recalcula las zonas.
- "todo": "reportes" + "cuentas": la base queda vacía salvo la cuenta de quien ejecuta la acción.
"""
import logging
from typing import Any, Awaitable, Callable, Literal
from uuid import UUID

from services.cluster_service import ClusterRepository, recalculate_clusters

logger = logging.getLogger(__name__)

ResetScope = Literal["agrupaciones", "reportes", "cuentas", "todo"]
BUCKET = "incident-photos"
PHOTO_PREFIX = "reports"


def _photo_path(url: str | None) -> str | None:
    marker = f"/{BUCKET}/"
    if not url or marker not in url:
        return None
    return url.split(marker, 1)[1].split("?", 1)[0]


class MaintenanceService:
    def __init__(self, pool_provider: Callable[[], Awaitable[Any]], supabase_getter: Callable[[], Any]):
        self._pool_provider = pool_provider
        self._supabase_getter = supabase_getter

    # --- Storage y Auth (API de Supabase con service_role) ---
    def _bucket(self):
        return self._supabase_getter().storage.from_(BUCKET)

    def _list_photos(self, prefix: str = PHOTO_PREFIX) -> list[str]:
        paths: list[str] = []
        for item in self._bucket().list(prefix, {"limit": 1000}) or []:
            path = f"{prefix}/{item['name']}"
            paths += self._list_photos(path) if item.get("id") is None else [path]
        return paths

    def _remove_photos(self, paths: list[str]) -> int:
        removed = 0
        for start in range(0, len(paths), 100):
            chunk = paths[start : start + 100]
            self._bucket().remove(chunk)
            removed += len(chunk)
        return removed

    def _list_user_ids(self) -> list[UUID]:
        admin, ids, page = self._supabase_getter().auth.admin, [], 1
        while True:
            users = admin.list_users(page=page, per_page=1000) or []
            ids += [UUID(str(u.id)) for u in users]
            if len(users) < 1000:
                return ids
            page += 1

    def _delete_users(self, user_ids: list[UUID]) -> int:
        admin = self._supabase_getter().auth.admin
        for uid in user_ids:
            admin.delete_user(str(uid))
        return len(user_ids)

    # --- Operación ---
    async def reset(self, scope: ResetScope, keep_user_id: UUID) -> dict[str, int]:
        pool = await self._pool_provider()
        counts = {"reportes": 0, "historial": 0, "agrupaciones": 0, "fotos": 0, "cuentas": 0}

        if scope == "agrupaciones":
            async with pool.acquire() as conn:
                counts["agrupaciones"] = await conn.fetchval(
                    "WITH d AS (DELETE FROM public.zonas_concentracion RETURNING 1) SELECT count(*) FROM d"
                )
            return counts

        victims = [uid for uid in self._list_user_ids() if uid != keep_user_id] if scope in ("cuentas", "todo") else []
        all_reports = scope in ("reportes", "todo")

        async with pool.acquire() as conn:
            async with conn.transaction():
                if all_reports:
                    photo_urls = [r["url_foto"] for r in await conn.fetch("SELECT url_foto FROM public.reportes")]
                    counts["historial"] = await conn.fetchval(
                        "WITH d AS (DELETE FROM public.historial_reportes RETURNING 1) SELECT count(*) FROM d"
                    )
                    counts["reportes"] = await conn.fetchval(
                        "WITH d AS (DELETE FROM public.reportes RETURNING 1) SELECT count(*) FROM d"
                    )
                    await conn.execute("ALTER TABLE public.reportes ALTER COLUMN numero_reporte RESTART WITH 1")
                else:
                    photo_urls = [
                        r["url_foto"]
                        for r in await conn.fetch(
                            "SELECT url_foto FROM public.reportes WHERE id_ciudadano = ANY($1::uuid[])", victims
                        )
                    ]
                    # Historial que registraron los usuarios a borrar en reportes que se conservan (FK RESTRICT).
                    counts["historial"] = await conn.fetchval(
                        "WITH d AS (DELETE FROM public.historial_reportes WHERE modificado_por = ANY($1::uuid[]) "
                        "RETURNING 1) SELECT count(*) FROM d",
                        victims,
                    )
                    counts["reportes"] = await conn.fetchval(
                        "WITH d AS (DELETE FROM public.reportes WHERE id_ciudadano = ANY($1::uuid[]) RETURNING 1) "
                        "SELECT count(*) FROM d",
                        victims,
                    )
                counts["agrupaciones"] = await conn.fetchval(
                    "WITH d AS (DELETE FROM public.zonas_concentracion RETURNING 1) SELECT count(*) FROM d"
                )

        photos = self._list_photos() if all_reports else [p for p in map(_photo_path, photo_urls) if p]
        try:
            counts["fotos"] = self._remove_photos(photos)
        except Exception:  # noqa: BLE001 — las fotos huérfanas no deben impedir el resto
            logger.exception("No se pudieron borrar todas las fotos del bucket")

        counts["cuentas"] = self._delete_users(victims)

        if not all_reports:
            await recalculate_clusters(ClusterRepository(self._pool_provider))
        logger.warning("Borrado de datos de prueba (%s) por %s: %s", scope, keep_user_id, counts)
        return counts


def get_maintenance_service() -> MaintenanceService:
    from database import get_db_pool, get_supabase_client

    return MaintenanceService(get_db_pool, get_supabase_client)
