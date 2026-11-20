"""/admin: dashboard, listado filtrado, transiciones FSM e historial (docs/02. system-contracts.md §6)."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from core.exceptions import ReportNotFoundException
from core.security import require_admin
from schemas.auth import UserProfile
from schemas.common import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    ErrorResponse,
    IncidentCategory,
    ReportStatus,
)
from schemas.report import (
    AdminReportsPage,
    DashboardStats,
    ReportHistoryResponse,
    StatusUpdateResponse,
    StatusUpdateSchema,
)
from services import cluster_service, notification_service, report_service
from services.cluster_service import ClusterRepository, get_cluster_repository
from services.push_service import PushService, get_push_service
from services.report_service import AdminReportFilters, ReportRepository, get_report_repository

router = APIRouter(prefix="/admin", tags=["admin"])

_AUTH_ERRORS = {401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}}


def _as_utc(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


@router.get("/dashboard/stats", response_model=DashboardStats, responses=_AUTH_ERRORS)
async def dashboard_stats(
    _: UserProfile = Depends(require_admin),
    repo: ReportRepository = Depends(get_report_repository),
    cluster_repo: ClusterRepository = Depends(get_cluster_repository),
) -> DashboardStats:
    counts = await repo.count_by_status()
    active_clusters = await cluster_repo.count_active_clusters()
    return report_service.build_dashboard_stats(counts, active_clusters, datetime.now(timezone.utc))


@router.get("/reports", response_model=AdminReportsPage, responses={**_AUTH_ERRORS, 400: {"model": ErrorResponse}})
async def list_reports(
    status: ReportStatus | None = Query(None),
    category: IncidentCategory | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    _: UserProfile = Depends(require_admin),
    repo: ReportRepository = Depends(get_report_repository),
) -> AdminReportsPage:
    filters = AdminReportFilters(
        status=status.value if status else None,
        category=category.value if category else None,
        start_date=_as_utc(start_date),
        end_date=_as_utc(end_date),
        search=search.strip() if search and search.strip() else None,
    )
    rows, total = await repo.list_admin_reports(filters, page, page_size)
    return report_service.build_admin_reports_page(rows, total, page, page_size)


@router.patch(
    "/reports/{report_id}/status",
    response_model=StatusUpdateResponse,
    responses={
        **_AUTH_ERRORS,
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
)
async def update_report_status(
    report_id: UUID,
    body: StatusUpdateSchema,
    background_tasks: BackgroundTasks,
    operator: UserProfile = Depends(require_admin),
    repo: ReportRepository = Depends(get_report_repository),
    cluster_repo: ClusterRepository = Depends(get_cluster_repository),
    push: PushService = Depends(get_push_service),
) -> StatusUpdateResponse:
    response, previous = await report_service.change_report_status(
        repo, report_id, body.new_status, body.admin_comment, operator
    )
    if report_service.affects_clusters(previous, body.new_status.value):
        background_tasks.add_task(cluster_service.recalculate_clusters_in_background, cluster_repo)
    # P13 resuelto (DEP-00): aviso push al ciudadano, en segundo plano y sin afectar la respuesta.
    if body.notify_citizen:
        background_tasks.add_task(
            notification_service.notify_status_change, repo, push, report_id, body.new_status.value, body.admin_comment
        )
    return response


@router.get(
    "/reports/{report_id}/history",
    response_model=ReportHistoryResponse,
    responses={**_AUTH_ERRORS, 400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def report_history(
    report_id: UUID,
    _: UserProfile = Depends(require_admin),
    repo: ReportRepository = Depends(get_report_repository),
) -> ReportHistoryResponse:
    row = await repo.get_report(report_id)
    if row is None:
        raise ReportNotFoundException(details={"report_id": str(report_id)})
    history = await repo.get_history(report_id)
    return report_service.build_history_response(row, history)
