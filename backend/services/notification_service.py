"""Aviso al ciudadano cuando un operador cambia el estado de su reporte (03 §4.6)."""
import logging
from uuid import UUID

from schemas.common import STATUS_LABELS, format_report_number
from services.push_service import PushService, build_status_message

logger = logging.getLogger(__name__)


async def notify_status_change(
    repo, push: PushService, report_id: UUID, new_status: str, admin_comment: str | None
) -> bool:
    """Envía la notificación si el ciudadano la tiene activada y registró su teléfono.

    Se ejecuta en segundo plano: cualquier fallo queda en el log y no afecta el cambio de estado.
    """
    try:
        report = await repo.get_report(report_id)
        if report is None:
            return False
        target = await repo.get_notification_target(report["citizen_id"])
        if not target or not target.get("enabled") or not target.get("push_token"):
            return False
        message = build_status_message(
            target["push_token"],
            str(report_id),
            format_report_number(report["report_number"]),
            STATUS_LABELS[new_status],
            admin_comment,
        )
        result = await push.send(message)
        if result.unregistered:
            await repo.clear_push_token(target["push_token"])
        return result.sent
    except Exception:  # noqa: BLE001 — un aviso fallido nunca debe propagarse
        logger.exception("Fallo al notificar el cambio de estado del reporte %s", report_id)
        return False
