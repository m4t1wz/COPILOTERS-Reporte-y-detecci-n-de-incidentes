"""Esquemas de autenticación (docs/02. system-contracts.md §3)."""
from uuid import UUID

from pydantic import BaseModel, Field

from schemas.common import UserRole


class RegisterRequest(BaseModel):
    # DOC-PENDIENTE: la especificación no define obligatoriedad ni reglas de formato de estos campos.
    # full_name es obligatorio (profiles.full_name NOT NULL); phone_number opcional; email y contraseña
    # los valida Supabase Auth.
    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1)
    phone_number: str | None = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone_number: str | None
    role: UserRole


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    user: UserOut
    # DOC-PENDIENTE: si Supabase exige confirmación de email, el registro no devuelve sesión (null).
    session: SessionOut | None


class RefreshResponse(SessionOut):
    pass


class UserProfile(BaseModel):
    """Perfil autenticado obtenido de public.profiles (uso interno de las dependencias RBAC)."""

    id: UUID
    email: str
    full_name: str
    phone_number: str | None = None
    role: UserRole
