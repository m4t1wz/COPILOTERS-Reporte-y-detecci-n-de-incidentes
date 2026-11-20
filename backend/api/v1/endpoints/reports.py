"""/reports: creación ciudadana y «Mis reportes» (docs/02. system-contracts.md §5)."""
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from core.exceptions import CommentOrPhotoRequiredException, InvalidInputException, ReportNotFoundException
from core.security import get_current_user, limiter, report_submit_limit, user_or_ip_key
from schemas.auth import UserProfile
from schemas.common import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ErrorResponse
from schemas.report import (
    COMMENT_OR_PHOTO_ERROR_TYPE,
    MyReportDetail,
    MyReportsPage,
    ReportConfirmationResponse,
    ReportCreateSchema,
)
from services import geo_service, report_service
from services.geocoding_service import GeocodingService, get_geocoding_service
from services.report_service import ReportRepository, get_report_repository
from services.storage_service import MAX_PHOTO_BYTES, StorageService, get_storage_service

router = APIRouter(prefix="/reports", tags=["reports"])

_AUTH_ERRORS = {401: {"model": ErrorResponse}}


def _validate_report_fields(category: str, latitude: float, longitude: float, comment: str | None, has_photo: bool) -> ReportCreateSchema:
    try:
        return ReportCreateSchema.model_validate(
            {"category": category, "latitude": latitude, "longitude": longitude, "comment": comment},
            context={"has_photo": has_photo},
        )
    except ValidationError as exc:
        errors = exc.errors(include_url=False, include_context=False, include_input=False)
        if any(err["type"] == COMMENT_OR_PHOTO_ERROR_TYPE for err in errors):
            raise CommentOrPhotoRequiredException() from exc
        details = [{"field": ".".join(str(p) for p in err["loc"]), "message": err["msg"]} for err in errors]
        raise InvalidInputException("Parámetros inválidos.", details) from exc


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ReportConfirmationResponse,
    responses={**_AUTH_ERRORS, 400: {"model": ErrorResponse}, 422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
@limiter.limit(report_submit_limit, key_func=user_or_ip_key)
async def create_report(
    request: Request,
    category: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    comment: str | None = Form(None),
    photo: UploadFile | None = File(None),
    current_user: UserProfile = Depends(get_current_user),
    repo: ReportRepository = Depends(get_report_repository),
    storage: StorageService = Depends(get_storage_service),
    geocoder: GeocodingService = Depends(get_geocoding_service),
) -> ReportConfirmationResponse:
    photo_bytes = b""
    if photo is not None and photo.filename:
        photo_bytes = await photo.read(MAX_PHOTO_BYTES + 1)
    has_photo = len(photo_bytes) > 0

    data = _validate_report_fields(category, latitude, longitude, comment, has_photo)
    geo_service.validate_coordinates(data.latitude, data.longitude)

    optimized = await run_in_threadpool(storage.prepare_photo, photo_bytes) if has_photo else None

    report_id = uuid4()
    photo_path = photo_url = None
    if optimized is not None:
        photo_path, photo_url = await storage.upload_report_photo(report_id, optimized, datetime.now(timezone.utc))

    address = await geocoder.reverse_geocode(data.latitude, data.longitude)
    try:
        row = await repo.create_report(
            report_id=report_id,
            citizen_id=current_user.id,
            category=data.category.value,
            comment=data.comment,
            photo_url=photo_url,
            latitude=data.latitude,
            longitude=data.longitude,
            address_reference=address,
        )
    except Exception:
        if photo_path:
            await storage.delete_photo(photo_path)
        raise
    return report_service.build_confirmation(row)


@router.get("/me", response_model=MyReportsPage, responses={**_AUTH_ERRORS, 400: {"model": ErrorResponse}})
async def list_my_reports(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: UserProfile = Depends(get_current_user),
    repo: ReportRepository = Depends(get_report_repository),
) -> MyReportsPage:
    rows, total = await repo.list_citizen_reports(current_user.id, page, page_size)
    return report_service.build_my_reports_page(rows, total, page, page_size)


@router.get(
    "/me/{report_id}",
    response_model=MyReportDetail,
    responses={**_AUTH_ERRORS, 400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def get_my_report(
    report_id: UUID,
    current_user: UserProfile = Depends(get_current_user),
    repo: ReportRepository = Depends(get_report_repository),
) -> MyReportDetail:
    row = await repo.get_report(report_id)
    # DOC-PENDIENTE: el acceso de un ciudadano a un reporte ajeno no tiene código definido; se responde 404.
    if row is None or (row["citizen_id"] != current_user.id and current_user.role != "admin"):
        raise ReportNotFoundException(details={"report_id": str(report_id)})
    history = await repo.get_history(report_id)
    return report_service.build_my_report_detail(row, history)
