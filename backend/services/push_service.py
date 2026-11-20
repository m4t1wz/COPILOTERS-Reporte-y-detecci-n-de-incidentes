"""Notificaciones push de cambio de estado vía Expo Push API → Firebase Cloud Messaging (03 §4.6).

El envío es "mejor esfuerzo": nunca bloquea ni revierte el cambio de estado que lo origina.
"""
import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
TIMEOUT_SECONDS = 10.0
ANDROID_CHANNEL_ID = "estado-reportes"  # Debe coincidir con el canal que crea la app móvil.
MAX_BODY_CHARS = 180


@dataclass
class PushResult:
    sent: bool
    unregistered: bool = False  # El token ya no es válido (app desinstalada o permiso revocado).


def is_expo_push_token(token: str | None) -> bool:
    return bool(token) and (token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")) and token.endswith("]")


def build_status_message(token: str, report_id: str, report_number: str, status_label: str, admin_comment: str | None) -> dict:
    body = f"Pasó a «{status_label}»."
    if admin_comment and admin_comment.strip():
        body = f"{body} {admin_comment.strip()}"
    if len(body) > MAX_BODY_CHARS:
        body = body[: MAX_BODY_CHARS - 1].rstrip() + "…"
    return {
        "to": token,
        "title": f"Reporte {report_number}",
        "body": body,
        "sound": "default",
        "priority": "high",
        "channelId": ANDROID_CHANNEL_ID,
        "data": {"type": "report_status", "report_id": report_id},
    }


class PushService:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None):
        self._transport = transport

    async def send(self, message: dict) -> PushResult:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, transport=self._transport) as client:
                response = await client.post(
                    EXPO_PUSH_URL, json=message, headers={"Accept": "application/json", "Content-Type": "application/json"}
                )
                response.raise_for_status()
                ticket = (response.json() or {}).get("data") or {}
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("No se pudo enviar la notificación push: %s", exc)
            return PushResult(sent=False)
        if isinstance(ticket, list):
            ticket = ticket[0] if ticket else {}
        if ticket.get("status") == "ok":
            return PushResult(sent=True)
        error = (ticket.get("details") or {}).get("error")
        logger.warning("Expo Push rechazó la notificación: %s (%s)", ticket.get("message"), error)
        return PushResult(sent=False, unregistered=error == "DeviceNotRegistered")


_push_service = PushService()


def get_push_service() -> PushService:
    return _push_service
