"""Excepciones de dominio (docs/01. architecture.md §7; docs/02. system-contracts.md §1.4)."""
from typing import Any


class AppException(Exception):
    status_code: int = 500
    code: str = "INTERNAL_SERVER_ERROR"
    default_message: str = "Error interno del servidor."

    def __init__(self, message: str | None = None, details: Any = None):
        self.message = message or self.default_message
        self.details = details
        super().__init__(self.message)


class InvalidInputException(AppException):
    status_code = 400
    code = "INVALID_INPUT"
    default_message = "Parámetros inválidos."


class AuthRequiredException(AppException):
    status_code = 401
    code = "AUTH_REQUIRED"
    default_message = "Se requiere autenticación."


class TokenExpiredException(AppException):
    status_code = 401
    code = "TOKEN_EXPIRED"
    default_message = "El token de sesión ha expirado."


class ForbiddenException(AppException):
    status_code = 403
    code = "FORBIDDEN_RESOURCE"
    default_message = "Acceso restringido a operadores administrativos."


class ReportNotFoundException(AppException):
    status_code = 404
    code = "REPORT_NOT_FOUND"
    default_message = "El reporte solicitado no existe."


class InvalidStateTransitionException(AppException):
    status_code = 409
    code = "INVALID_STATE_TRANSITION"
    default_message = "La transición de estado solicitada no está permitida."


class OutsideTerritoryException(AppException):
    status_code = 422
    code = "OUTSIDE_TERRITORY"
    default_message = "La ubicación seleccionada se encuentra fuera del territorio provincial de Formosa."


class ValidationErrorException(AppException):
    status_code = 422
    code = "VALIDATION_ERROR"
    default_message = "La solicitud no cumple una regla de validación."


class CommentOrPhotoRequiredException(AppException):
    status_code = 422
    code = "COMMENT_OR_PHOTO_REQUIRED"
    default_message = "Debe proporcionar una fotografía o redactar un comentario descriptivo de la situación."


class RateLimitExceededException(AppException):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"
    default_message = "Se superó el límite de solicitudes por minuto."
