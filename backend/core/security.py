"""Verificación de JWT de Supabase, dependencias RBAC y rate limiting
(docs/03. backend.md §3; docs/01. architecture.md §6 y §8.3)."""
import logging
from typing import Any
from uuid import UUID

import httpx
from cachetools import TTLCache
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from limits import parse as parse_limit
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.config import settings
from core.exceptions import AuthRequiredException, ForbiddenException, TokenExpiredException, RateLimitExceededException
from schemas.auth import UserProfile
from services.report_service import ReportRepository, get_report_repository

logger = logging.getLogger(__name__)

JWT_AUDIENCE = "authenticated"
ASYMMETRIC_ALGORITHMS = {"RS256", "ES256"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

_jwks_cache: TTLCache = TTLCache(maxsize=1, ttl=600)


def _get_jwks() -> dict:
    # DOC-PENDIENTE: 03 §3.1 menciona JWKS para firma asimétrica sin indicar la URL; se usa el endpoint
    # estándar de Supabase Auth.
    cached = _jwks_cache.get("jwks")
    if cached is None:
        response = httpx.get(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", timeout=5)
        response.raise_for_status()
        cached = response.json()
        _jwks_cache["jwks"] = cached
    return cached


def decode_access_token(token: str) -> dict[str, Any]:
    """Valida firma, vigencia y audiencia del access token emitido por Supabase Auth."""
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm == "HS256":
            if not settings.supabase_jwt_secret:
                raise AuthRequiredException("El servidor no tiene configurado SUPABASE_JWT_SECRET.")
            key: Any = settings.supabase_jwt_secret
        elif algorithm in ASYMMETRIC_ALGORITHMS:
            keys = _get_jwks().get("keys", [])
            key = next((k for k in keys if k.get("kid") == header.get("kid")), None)
            if key is None:
                raise AuthRequiredException("Token inválido.")
        else:
            raise AuthRequiredException("Token inválido.")
        return jwt.decode(token, key, algorithms=[algorithm], audience=JWT_AUDIENCE)
    except ExpiredSignatureError as exc:
        raise TokenExpiredException() from exc
    except (JWTError, httpx.HTTPError) as exc:
        raise AuthRequiredException("Token inválido.") from exc


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    repo: ReportRepository = Depends(get_report_repository),
) -> UserProfile:
    """Valida el token vigente y que pertenezca a un usuario registrado en `perfiles`."""
    if not token:
        raise AuthRequiredException()
    claims = decode_access_token(token)
    try:
        user_id = UUID(str(claims.get("sub")))
    except ValueError as exc:
        raise AuthRequiredException("Token inválido.") from exc
    profile = await repo.get_profile(user_id)
    if profile is None:
        raise AuthRequiredException("El usuario no está registrado.")
    return UserProfile(**profile)


async def require_admin(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    if current_user.role != "admin":
        raise ForbiddenException("Acceso restringido a operadores administrativos.")
    return current_user


async def get_optional_admin(
    token: str | None = Depends(oauth2_scheme),
    repo: ReportRepository = Depends(get_report_repository),
) -> UserProfile | None:
    """Administrador autenticado o None. Nunca rechaza: las rutas públicas siguen siendo públicas."""
    if not token:
        return None
    try:
        user = await get_current_user(token, repo)
    except Exception:  # noqa: BLE001 — token ausente, inválido o vencido: se trata como público
        return None
    return user if user.role == "admin" else None


# --- Rate limiting (SlowAPI) ---
def user_or_ip_key(request: Request) -> str:
    """Clave por ID de usuario autenticado; si no hay token válido, por IP del cliente."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        try:
            sub = decode_access_token(auth[7:].strip()).get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


def report_submit_limit() -> str:
    return f"{settings.report_submit_rate_limit_per_minute}/minute"


limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


async def enforce_global_rate_limit(request: Request) -> None:
    """Límite global por IP (RATE_LIMIT_PER_MINUTE) para todas las rutas de /api/v1.

    Desde FastAPI 0.16x, las rutas agregadas con include_router quedan dentro de un `_IncludedRouter` que el
    SlowAPIMiddleware no recorre: no encontraba el handler y las trataba como exentas, así que el límite solo
    regía para /health. Se aplica como dependencia del router, con el mismo almacenamiento y la misma clave
    (IP del cliente; detrás del proxy del hosting, la de X-Forwarded-For gracias a --proxy-headers).
    """
    if not limiter.enabled:
        return
    item = parse_limit(f"{settings.rate_limit_per_minute}/minute")
    if not limiter.limiter.hit(item, "global-api", get_remote_address(request)):
        raise RateLimitExceededException()
