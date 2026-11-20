"""Herramienta oculta de borrado de datos para pruebas (03 §4.7). Deshabilitada salvo ENABLE_DATA_RESET=true."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from starlette.exceptions import HTTPException

from core.config import settings
from core.exceptions import ValidationErrorException
from core.security import require_admin
from schemas.auth import UserProfile
from schemas.common import ErrorResponse
from services.maintenance_service import MaintenanceService, get_maintenance_service

router = APIRouter(prefix="/admin/maintenance", tags=["maintenance"])

CONFIRMATION_WORD = "BORRAR"


class ResetRequest(BaseModel):
    scope: Literal["agrupaciones", "reportes", "cuentas", "todo"]
    confirmation: str


class ResetResponse(BaseModel):
    scope: str
    deleted: dict[str, int]


def ensure_reset_enabled() -> None:
    # Deshabilitada: responde como una ruta inexistente, también sin sesión.
    if not settings.enable_data_reset:
        raise HTTPException(status_code=404)


@router.post(
    "/reset",
    response_model=ResetResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse},
               422: {"model": ErrorResponse}},
)
async def reset_data(
    body: ResetRequest,
    _: None = Depends(ensure_reset_enabled),
    admin: UserProfile = Depends(require_admin),
    service: MaintenanceService = Depends(get_maintenance_service),
) -> ResetResponse:
    if body.confirmation.strip() != CONFIRMATION_WORD:
        raise ValidationErrorException(
            f"Para confirmar, escribí {CONFIRMATION_WORD}.", {"field": "confirmation"}
        )
    deleted = await service.reset(body.scope, admin.id)
    return ResetResponse(scope=body.scope, deleted=deleted)
