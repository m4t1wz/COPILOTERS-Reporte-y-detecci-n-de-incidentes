"""/auth: registro, login y refresh contra Supabase Auth (docs/02. system-contracts.md §3)."""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, status
from starlette.concurrency import run_in_threadpool
from supabase import Client
from supabase_auth.errors import AuthError

from core.exceptions import AuthRequiredException, InvalidInputException
from database import create_auth_client
from schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    SessionOut,
    UserOut,
)
from schemas.common import ErrorResponse
from services.report_service import ReportRepository, get_report_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

ERROR_RESPONSES = {400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}}


def get_auth_client() -> Client:
    return create_auth_client()


def _session_out(session) -> SessionOut | None:
    if session is None:
        return None
    return SessionOut(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type="bearer",
        expires_in=session.expires_in,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=AuthResponse, responses=ERROR_RESPONSES)
async def register(
    body: RegisterRequest,
    auth_client: Client = Depends(get_auth_client),
    repo: ReportRepository = Depends(get_report_repository),
) -> AuthResponse:
    metadata = {"full_name": body.full_name}
    if body.phone_number:
        metadata["phone_number"] = body.phone_number
    try:
        # El rol nunca se envía desde el backend: el trigger handle_new_user asigna 'citizen'.
        result = await run_in_threadpool(
            auth_client.auth.sign_up,
            {"email": body.email, "password": body.password, "options": {"data": metadata}},
        )
    except AuthError as exc:
        # DOC-PENDIENTE: código de error para registro rechazado (email duplicado, contraseña débil) no definido.
        raise InvalidInputException(f"No se pudo registrar el usuario: {exc.message}") from exc
    if result.user is None:
        raise InvalidInputException("No se pudo registrar el usuario.")

    user_id = UUID(str(result.user.id))
    profile = await repo.get_profile(user_id)
    user = UserOut(
        id=user_id,
        email=profile["email"] if profile else body.email,
        full_name=profile["full_name"] if profile else body.full_name,
        phone_number=profile["phone_number"] if profile else body.phone_number,
        role=profile["role"] if profile else "citizen",
    )
    return AuthResponse(user=user, session=_session_out(result.session))


@router.post("/login", response_model=AuthResponse, responses=ERROR_RESPONSES)
async def login(
    body: LoginRequest,
    auth_client: Client = Depends(get_auth_client),
    repo: ReportRepository = Depends(get_report_repository),
) -> AuthResponse:
    try:
        result = await run_in_threadpool(
            auth_client.auth.sign_in_with_password, {"email": body.email, "password": body.password}
        )
    except AuthError as exc:
        # DOC-PENDIENTE: código de error para credenciales inválidas no definido; se usa AUTH_REQUIRED (401).
        raise AuthRequiredException("Credenciales inválidas.") from exc
    if result.user is None or result.session is None:
        raise AuthRequiredException("Credenciales inválidas.")

    profile = await repo.get_profile(UUID(str(result.user.id)))
    if profile is None:
        raise AuthRequiredException("El usuario no está registrado.")
    return AuthResponse(user=UserOut(**profile), session=_session_out(result.session))


@router.post("/refresh", response_model=RefreshResponse, responses=ERROR_RESPONSES)
async def refresh(body: RefreshRequest, auth_client: Client = Depends(get_auth_client)) -> RefreshResponse:
    try:
        result = await run_in_threadpool(auth_client.auth.refresh_session, body.refresh_token)
    except AuthError as exc:
        # DOC-PENDIENTE: código de error para refresh token inválido no definido; se usa AUTH_REQUIRED (401).
        raise AuthRequiredException("Refresh token inválido o vencido.") from exc
    if result.session is None:
        raise AuthRequiredException("Refresh token inválido o vencido.")
    return RefreshResponse(**_session_out(result.session).model_dump())
