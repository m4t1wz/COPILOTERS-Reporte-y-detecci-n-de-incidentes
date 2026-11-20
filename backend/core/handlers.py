"""Exception handlers globales con formato RFC 7807 simplificado (docs/02. system-contracts.md §1.4)."""
import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.exceptions import AppException, RateLimitExceededException
from schemas.common import iso_utc, utc_now

logger = logging.getLogger(__name__)

# Códigos de la tabla de 01 §7 por estado HTTP.
_HTTP_STATUS_CODES = {
    400: "INVALID_INPUT",
    401: "AUTH_REQUIRED",
    403: "FORBIDDEN_RESOURCE",
    409:"INVALID_STATE_TRANSITION",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR",
}


def error_response(status_code: int, code: str, message: str, details: Any = None, headers=None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "timestamp": iso_utc(utc_now()),
            }
        },
        headers=headers,
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message, exc.details)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # DOC-PENDIENTE: la especificación no define error.code para rutas inexistentes (404) ni métodos no
    # permitidos (405); se usa "HTTP_<status>" para estados fuera de la tabla de 01 §7.
    code = _HTTP_STATUS_CODES.get(exc.status_code, f"HTTP_{exc.status_code}")
    message = exc.detail if isinstance(exc.detail, str) else "Error en la solicitud."
    return error_response(exc.status_code, code, message, None, getattr(exc, "headers", None))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # DOC-PENDIENTE: 01 §7 asigna 400 INVALID_INPUT a parámetros inválidos; se aplica a todo error de
    # validación de la solicitud (FastAPI devolvería 422 por defecto).
    details = [
        {"field": ".".join(str(part) for part in err.get("loc", ())), "message": err.get("msg", "")}
        for err in exc.errors()
    ]
    return error_response(400, "INVALID_INPUT", "Parámetros inválidos o sintaxis JSON incorrecta.", details)


def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    # Síncrono a propósito: SlowAPIMiddleware descarta los handlers async y usa su formato propio.
    err = RateLimitExceededException()
    return error_response(err.status_code, err.code, err.message, {"limit": str(exc.detail)})


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Error no controlado: %s", exc)
    return error_response(500, "INTERNAL_SERVER_ERROR", "Error interno del servidor.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
