"""/users/me: preferencias del usuario autenticado (ampliación de 02 §5; ver 03 §4.6)."""
from fastapi import APIRouter, Depends

from core.security import get_current_user
from schemas.auth import UserProfile
from schemas.common import ErrorResponse
from schemas.notification import NotificationSettingsRequest, NotificationSettingsResponse
from services.report_service import ReportRepository, get_report_repository

router = APIRouter(prefix="/users", tags=["users"])


@router.put(
    "/me/notifications",
    response_model=NotificationSettingsResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def update_notification_settings(
    body: NotificationSettingsRequest,
    user: UserProfile = Depends(get_current_user),
    repo: ReportRepository = Depends(get_report_repository),
) -> NotificationSettingsResponse:
    saved = await repo.set_notification_settings(user.id, body.enabled, body.push_token)
    return NotificationSettingsResponse(enabled=saved["enabled"], has_token=bool(saved["push_token"]))
