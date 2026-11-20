"""Endpoints administrativos /api/v1/admin (docs/02. system-contracts.md §6; 07 TASK-BE-05)."""
import re
from uuid import UUID, uuid4

import pytest

from tests.conftest import FIXED_ADDRESS, INSIDE, assert_error, auth_header, post_report

ISO_MS_Z = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


def _create(client, user, **kwargs) -> str:
    return post_report(client, user["id"], **kwargs).json()["confirmation"]["report_id"]


def _patch(client, ctx, report_id, new_status, comment=None, **extra):
    body = {"new_status": new_status, **extra}
    if comment is not None:
        body["admin_comment"] = comment
    return client.patch(f"/api/v1/admin/reports/{report_id}/status", json=body, headers=auth_header(ctx.admin["id"]))


# --- PATCH status ---
def test_update_status_response_contract(client, ctx):
    rid = _create(client, ctx.citizen)
    response = _patch(client, ctx, rid, "en_revision", "Asignado a cuadrilla zona centro.", notify_citizen=True)
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"report_id", "report_number", "previous_status", "current_status", "admin_comment",
                         "updated_at", "operator"}
    assert body["report_id"] == rid
    assert body["report_number"] == "#00001"
    assert body["previous_status"] == "pendiente"
    assert body["current_status"] == "en_revision"
    assert body["admin_comment"] == "Asignado a cuadrilla zona centro."
    assert ISO_MS_Z.match(body["updated_at"])
    assert body["operator"] == {"id": str(ctx.admin["id"]), "full_name": "Ing. María González"}
    assert ctx.repo.reports[UUID(rid)]["current_status"] == "en_revision"


def test_invalid_transition_returns_409(client, ctx):
    rid = _create(client, ctx.citizen)
    err = assert_error(_patch(client, ctx, rid, "resuelto"), 409, "INVALID_STATE_TRANSITION")
    assert err["details"]["current_status"] == "pendiente"
    assert ctx.repo.reports[UUID(rid)]["current_status"] == "pendiente"
    assert len(ctx.repo.history) == 1


def test_same_status_transition_returns_409(client, ctx):
    rid = _create(client, ctx.citizen)
    assert_error(_patch(client, ctx, rid, "pendiente", "Sin cambios"), 409, "INVALID_STATE_TRANSITION")


def test_terminal_states_cannot_change(client, ctx):
    rid = _create(client, ctx.citizen)
    assert _patch(client, ctx, rid, "descartado", "Aviso duplicado").status_code == 200
    assert_error(_patch(client, ctx, rid, "en_revision", "Reabrir"), 409, "INVALID_STATE_TRANSITION")


@pytest.mark.parametrize("status", ["en_revision", "descartado"])
def test_comment_required_for_status(client, ctx, status):
    rid = _create(client, ctx.citizen)
    assert_error(_patch(client, ctx, rid, status), 422, "VALIDATION_ERROR")


def test_comment_required_for_en_seguimiento(client, ctx):
    rid = _create(client, ctx.citizen)
    _patch(client, ctx, rid, "en_revision", "Evaluando")
    _patch(client, ctx, rid, "verificado")
    assert_error(_patch(client, ctx, rid, "en_seguimiento"), 422, "VALIDATION_ERROR")
    assert _patch(client, ctx, rid, "en_seguimiento", "Cuadrilla enviada").status_code == 200


def test_comment_optional_for_verificado(client, ctx):
    rid = _create(client, ctx.citizen)
    _patch(client, ctx, rid, "en_revision", "Evaluando")
    response = _patch(client, ctx, rid, "verificado")
    assert response.status_code == 200
    assert response.json()["admin_comment"] is None


@pytest.mark.parametrize("body", [
    {"new_status": "en_revision", "admin_comment": "abc"},       # < 5 caracteres
    {"new_status": "en_revision", "admin_comment": "x" * 1001},  # > 1000 caracteres
    {"new_status": "cerrado", "admin_comment": "Comentario"},    # estado inexistente
    {"admin_comment": "Comentario"},                             # falta new_status
    {"new_status": "en_revision", "admin_comment": "Comentario", "notify_citizen": "quizas"},
])
def test_invalid_status_body_returns_400(client, ctx, body):
    rid = _create(client, ctx.citizen)
    response = client.patch(f"/api/v1/admin/reports/{rid}/status", json=body, headers=auth_header(ctx.admin["id"]))
    assert_error(response, 400, "INVALID_INPUT")


def test_update_status_unknown_report_returns_404(client, ctx):
    assert_error(_patch(client, ctx, str(uuid4()), "en_revision", "Comentario"), 404, "REPORT_NOT_FOUND")


def test_status_change_requires_admin(client, ctx):
    rid = _create(client, ctx.citizen)
    response = client.patch(f"/api/v1/admin/reports/{rid}/status",
                            json={"new_status": "en_revision", "admin_comment": "Comentario"})
    assert_error(response, 401, "AUTH_REQUIRED")


def test_cluster_recalculation_runs_in_background_on_verification(client, ctx):
    rid = _create(client, ctx.citizen)
    _patch(client, ctx, rid, "en_revision", "Evaluando")
    assert ctx.clusters.recalculations == 0
    _patch(client, ctx, rid, "verificado")
    assert ctx.clusters.recalculations == 1


# --- GET history ---
def test_history_records_operator_identity(client, ctx):
    rid = _create(client, ctx.citizen)
    _patch(client, ctx, rid, "en_revision", "Asignado a cuadrilla zona centro.")
    second_admin = ctx.repo.add_profile(role="admin", full_name="Lic. Pedro Ruiz")
    client.patch(f"/api/v1/admin/reports/{rid}/status", json={"new_status": "verificado"},
                 headers=auth_header(second_admin["id"]))

    response = client.get(f"/api/v1/admin/reports/{rid}/history", headers=auth_header(ctx.admin["id"]))
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"report_id", "report_number", "history"}
    assert body["report_id"] == rid
    assert body["report_number"] == "#00001"
    history = body["history"]
    assert len(history) == 3
    for item in history:
        assert set(item) == {"id", "previous_status", "new_status", "admin_comment", "changed_by", "created_at"}
        assert set(item["changed_by"]) == {"user_id", "role", "name"}
        assert ISO_MS_Z.match(item["created_at"])
    assert history[0]["previous_status"] is None
    assert history[0]["new_status"] == "pendiente"
    assert history[0]["changed_by"] == {"user_id": str(ctx.citizen["id"]), "role": "citizen", "name": "Juan Pérez"}
    assert history[1]["previous_status"] == "pendiente"
    assert history[1]["new_status"] == "en_revision"
    assert history[1]["admin_comment"] == "Asignado a cuadrilla zona centro."
    assert history[1]["changed_by"] == {"user_id": str(ctx.admin["id"]), "role": "admin",
                                        "name": "Ing. María González"}
    assert history[2]["changed_by"]["name"] == "Lic. Pedro Ruiz"
    assert [h["created_at"] for h in history] == sorted(h["created_at"] for h in history)


def test_history_unknown_report(client, ctx):
    assert_error(client.get(f"/api/v1/admin/reports/{uuid4()}/history", headers=auth_header(ctx.admin["id"])),
                 404, "REPORT_NOT_FOUND")


# --- GET reports ---
def test_admin_reports_list_contract(client, ctx):
    rid = _create(client, ctx.citizen)
    response = client.get("/api/v1/admin/reports", headers=auth_header(ctx.admin["id"]))
    assert response.status_code == 200
    body = response.json()
    item = body["items"][0]
    assert set(item) == {"id", "report_number", "category", "category_label", "created_at", "location", "photo_url",
                         "citizen_comment", "current_status", "citizen"}
    assert item["id"] == rid
    assert item["location"] == {"latitude": INSIDE[0], "longitude": INSIDE[1], "address_reference": FIXED_ADDRESS}
    assert item["citizen_comment"] == "El agua supera la vereda e ingresa a los domicilios."
    assert item["current_status"] == "pendiente"
    assert item["citizen"] == {"id": str(ctx.citizen["id"]), "full_name": "Juan Pérez", "phone_number": "+543704123456"}
    assert body["pagination"] == {"page": 1, "page_size": 20, "total_items": 1, "total_pages": 1,
                                  "has_next": False, "has_prev": False}


def test_admin_reports_filters(client, ctx):
    a = _create(client, ctx.citizen, comment="Agua en la vereda")
    b = _create(client, ctx.citizen, category="arbol_caido", comment="Rama sobre el auto")
    c = _create(client, ctx.other_citizen, comment="Cable cortado")
    _patch(client, ctx, c, "en_revision", "Evaluando")
    headers = auth_header(ctx.admin["id"])

    def ids(query):
        return [i["id"] for i in client.get(f"/api/v1/admin/reports?{query}", headers=headers).json()["items"]]

    assert ids("") == [c, b, a]
    assert ids("status=en_revision") == [c]
    assert ids("category=arbol_caido") == [b]
    assert ids("search=rama") == [b]
    assert ids("search=Fontana") == [c, b, a]  # coincide con la dirección
    assert ids("search=100%25") == []
    created_b = ctx.repo.reports[UUID(b)]["created_at"].isoformat().replace("+00:00", "Z")
    assert ids(f"start_date={created_b}") == [c, b]
    assert ids(f"end_date={created_b}") == [b, a]


def test_admin_reports_pagination(client, ctx):
    for user in (ctx.citizen, ctx.other_citizen):
        for _ in range(3):
            _create(client, user)
    body = client.get("/api/v1/admin/reports?page=3&page_size=2", headers=auth_header(ctx.admin["id"])).json()
    assert len(body["items"]) == 2
    assert body["pagination"] == {"page": 3, "page_size": 2, "total_items": 6, "total_pages": 3,
                                  "has_next": False, "has_prev": True}


# --- GET dashboard/stats ---
def test_dashboard_stats(client, ctx):
    ids = [_create(client, ctx.citizen) for _ in range(4)] + [_create(client, ctx.other_citizen) for _ in range(2)]
    _patch(client, ctx, ids[0], "en_revision", "Evaluando")
    _patch(client, ctx, ids[1], "descartado", "Duplicado")
    _patch(client, ctx, ids[2], "en_revision", "Evaluando")
    _patch(client, ctx, ids[2], "verificado")
    _patch(client, ctx, ids[3], "en_revision", "Evaluando")
    _patch(client, ctx, ids[3], "verificado")
    _patch(client, ctx, ids[3], "en_seguimiento", "Cuadrilla enviada")
    _patch(client, ctx, ids[4], "en_revision", "Evaluando")
    _patch(client, ctx, ids[4], "verificado")
    _patch(client, ctx, ids[4], "resuelto")

    response = client.get("/api/v1/admin/dashboard/stats", headers=auth_header(ctx.admin["id"]))
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"total_reports", "pending_reports", "in_review_reports", "verified_reports",
                         "in_progress_reports", "resolved_reports", "discarded_reports", "active_clusters_count",
                         "last_updated"}
    assert body["total_reports"] == 6
    assert body["pending_reports"] == 1
    assert body["in_review_reports"] == 1
    assert body["verified_reports"] == 1
    assert body["in_progress_reports"] == 1
    assert body["resolved_reports"] == 1
    assert body["discarded_reports"] == 1
    assert body["active_clusters_count"] == 0
    assert ISO_MS_Z.match(body["last_updated"])
