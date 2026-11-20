"""Notificaciones push de cambio de estado (02 §5, 03 §4.6)."""
import asyncio

import httpx

from services.push_service import PushResult, PushService, build_status_message, is_expo_push_token
from tests.conftest import assert_error, auth_header, post_report

TOKEN = "ExponentPushToken[abc123]"
URL = "/api/v1/users/me/notifications"


def _enable(client, user_id, token=TOKEN):
    return client.put(URL, json={"enabled": True, "push_token": token}, headers=auth_header(user_id))


def _create_report(client, ctx):
    response = post_report(client, ctx.citizen["id"], comment="Calle cortada por el agua")
    assert response.status_code == 201
    return response.json()["confirmation"]["report_id"]


def _change(client, ctx, report_id, *, notify=True, status="en_revision", comment="Cuadrilla enviada al lugar."):
    return client.patch(
        f"/api/v1/admin/reports/{report_id}/status",
        json={"new_status": status, "admin_comment": comment, "notify_citizen": notify},
        headers=auth_header(ctx.admin["id"]),
    )


def test_register_and_disable_push_token(client, ctx):
    response = _enable(client, ctx.citizen["id"])
    assert response.status_code == 200
    assert response.json() == {"enabled": True, "has_token": True}
    response = client.put(URL, json={"enabled": False, "push_token": None}, headers=auth_header(ctx.citizen["id"]))
    assert response.json() == {"enabled": False, "has_token": False}
    assert ctx.repo.notifications[ctx.citizen["id"]]["push_token"] is None


def test_token_moves_to_new_account_on_same_phone(client, ctx):
    _enable(client, ctx.citizen["id"])
    _enable(client, ctx.other_citizen["id"])
    assert ctx.repo.notifications[ctx.citizen["id"]]["push_token"] is None
    assert ctx.repo.notifications[ctx.other_citizen["id"]]["push_token"] == TOKEN


def test_invalid_or_missing_token_is_rejected(client, ctx):
    assert_error(_enable(client, ctx.citizen["id"], token="no-es-un-token"), 400, "INVALID_INPUT")
    assert_error(client.put(URL, json={"enabled": True}, headers=auth_header(ctx.citizen["id"])), 400, "INVALID_INPUT")


def test_requires_authentication(client):
    assert_error(client.put(URL, json={"enabled": False}), 401, "AUTH_REQUIRED")


def test_status_change_sends_push_to_citizen(client, ctx):
    _enable(client, ctx.citizen["id"])
    report_id = _create_report(client, ctx)
    assert _change(client, ctx, report_id).status_code == 200
    assert len(ctx.push.sent) == 1
    message = ctx.push.sent[0]
    assert message["to"] == TOKEN
    assert message["title"] == "Reporte #00001"
    assert message["body"] == "Pasó a «En revisión». Cuadrilla enviada al lugar."
    assert message["data"] == {"type": "report_status", "report_id": report_id}
    assert message["channelId"] == "estado-reportes"


def test_no_push_when_operator_unchecks_notify(client, ctx):
    _enable(client, ctx.citizen["id"])
    report_id = _create_report(client, ctx)
    assert _change(client, ctx, report_id, notify=False).status_code == 200
    assert ctx.push.sent == []


def test_no_push_when_citizen_disabled_notifications(client, ctx):
    report_id = _create_report(client, ctx)
    assert _change(client, ctx, report_id).status_code == 200
    assert ctx.push.sent == []


def test_unregistered_device_clears_token_and_status_change_succeeds(client, ctx):
    _enable(client, ctx.citizen["id"])
    ctx.push.next_result = PushResult(sent=False, unregistered=True)
    report_id = _create_report(client, ctx)
    assert _change(client, ctx, report_id).status_code == 200
    assert ctx.repo.notifications[ctx.citizen["id"]]["push_token"] is None


def test_push_failure_never_breaks_status_change(client, ctx):
    async def boom(message):
        raise RuntimeError("Expo caído")

    _enable(client, ctx.citizen["id"])
    ctx.push.send = boom
    report_id = _create_report(client, ctx)
    response = _change(client, ctx, report_id)
    assert response.status_code == 200
    assert response.json()["current_status"] == "en_revision"


def test_expo_token_format():
    assert is_expo_push_token("ExponentPushToken[xyz]")
    assert is_expo_push_token("ExpoPushToken[xyz]")
    assert not is_expo_push_token("xyz")
    assert not is_expo_push_token(None)


def test_long_comment_is_truncated():
    message = build_status_message(TOKEN, "id", "#00001", "Resuelto", "x" * 500)
    assert len(message["body"]) <= 180
    assert message["body"].endswith("…")


def test_push_service_parses_expo_tickets():
    def ok(request):
        return httpx.Response(200, json={"data": {"status": "ok", "id": "t1"}})

    def unregistered(request):
        return httpx.Response(200, json={"data": {"status": "error", "message": "no registrado",
                                                  "details": {"error": "DeviceNotRegistered"}}})

    def down(request):
        raise httpx.ConnectError("sin red")

    message = build_status_message(TOKEN, "id", "#00001", "Verificado", None)
    assert asyncio.run(PushService(httpx.MockTransport(ok)).send(message)) == PushResult(sent=True)
    assert asyncio.run(PushService(httpx.MockTransport(unregistered)).send(message)) == PushResult(sent=False, unregistered=True)
    assert asyncio.run(PushService(httpx.MockTransport(down)).send(message)) == PushResult(sent=False)
