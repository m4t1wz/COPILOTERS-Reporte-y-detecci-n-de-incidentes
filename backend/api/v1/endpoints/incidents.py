"""/incidents: mapa público, zonas de concentración y ficha pública (docs/02. system-contracts.md §4)."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.exceptions import InvalidInputException, ReportNotFoundException
from core.security import get_optional_admin
from schemas.auth import UserProfile
from schemas.cluster import ClusterFeatureCollection
from schemas.common import ErrorResponse, IncidentCategory, ReportStatus
from schemas.incident import IncidentDetail, IncidentFeatureCollection
from services import cluster_service, report_service
from services.cluster_service import ClusterRepository, get_cluster_repository
from services.report_service import IncidentFilters, ReportRepository, get_report_repository

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _as_utc(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def parse_bbox(bbox: str | None) -> tuple[float, float, float, float] | None:
    if bbox is None:
        return None
    try:
        min_lon, min_lat, max_lon, max_lat = (float(part) for part in bbox.split(","))
    except ValueError as exc:
        raise InvalidInputException(
            "bbox debe tener el formato min_lon,min_lat,max_lon,max_lat.", {"bbox": bbox}
        ) from exc
    if not (-180 <= min_lon < max_lon <= 180 and -90 <= min_lat < max_lat <= 90):
        raise InvalidInputException("bbox fuera de rango o con extremos invertidos.", {"bbox": bbox})
    return min_lon, min_lat, max_lon, max_lat


@router.get("", response_model=IncidentFeatureCollection, responses={400: {"model": ErrorResponse}})
async def list_incidents(
    category: IncidentCategory | None = Query(None),
    status: ReportStatus | None = Query(None),
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    repo: ReportRepository = Depends(get_report_repository),
    admin: UserProfile | None = Depends(get_optional_admin),
) -> IncidentFeatureCollection:
    # Público: solo incidentes verificados por un operador (verificado, en_seguimiento).
    # Administrador autenticado: estados activos por defecto y cualquier estado con el filtro `status`.
    if admin is not None:
        statuses = [status.value] if status else list(report_service.ACTIVE_STATUSES)
    else:
        allowed = report_service.PUBLIC_STATUSES
        statuses = ([status.value] if status.value in allowed else []) if status else list(allowed)
    if not statuses:
        return report_service.build_incident_collection([])
    filters = IncidentFilters(
        statuses=statuses,
        category=category.value if category else None,
        bbox=parse_bbox(bbox),
        start_date=_as_utc(start_date),
        end_date=_as_utc(end_date),
    )
    rows = await repo.list_incidents(filters)
    return report_service.build_incident_collection(rows)


@router.get("/clusters", response_model=ClusterFeatureCollection)
async def list_clusters(
    cluster_repo: ClusterRepository = Depends(get_cluster_repository),
) -> ClusterFeatureCollection:
    rows = await cluster_repo.list_active_clusters()
    return cluster_service.build_cluster_collection(rows)


@router.get(
    "/{incident_id}",
    response_model=IncidentDetail,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def get_incident(
    incident_id: UUID,
    repo: ReportRepository = Depends(get_report_repository),
    admin: UserProfile | None = Depends(get_optional_admin),
) -> IncidentDetail:
    row = await repo.get_report(incident_id)
    # La ficha pública solo existe para incidentes verificados; el panel (administrador) ve cualquier reporte.
    visible = admin is not None or (row is not None and row["current_status"] in report_service.PUBLIC_STATUSES)
    if row is None or not visible:
        raise ReportNotFoundException(details={"report_id": str(incident_id)})
    return report_service.build_incident_detail(row)
