"""Preferencia de notificaciones push del usuario (ampliación de 02 §5)."""
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from services.push_service import is_expo_push_token


class NotificationSettingsRequest(BaseModel):
    enabled: bool
    push_token: Optional[str] = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _token_required_when_enabled(self):
        if self.enabled and not is_expo_push_token(self.push_token):
            raise ValueError("push_token debe ser un token de Expo (ExponentPushToken[...]) cuando enabled es true.")
        return self


class NotificationSettingsResponse(BaseModel):
    enabled: bool
    has_token: bool
