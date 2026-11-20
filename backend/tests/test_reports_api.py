"""Integración de /api/v1/reports (docs/02. system-contracts.md §5; 07 TASK-BE-04)."""
import re
from uuid import UUID, uuid4

import pytest

from tests.conftest import (
    ASUNCION,
    FIXED_ADDRESS,
    INSIDE,
    assert_error,
    auth_header,
    make_image,
    post_report,
)

ISO_MS_Z = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


# --- POST /reports ---
def test_create_report_with_comment_returns_confirmation_card(client, ctx):
    response = post_report(client, ctx.citizen["id"])
    assert response.status_code == 201, response.text
    body = response.json()
    assert set(body) == {"confirmation"}
    c = body["confirmation"]
    assert set(c) == {"success", "message", "report_id", "report_number", "category", "category_label", "location",
                      "created_at", "status", "status_label", "status_message", "photo_url"}
    assert c["success"] is True
    assert c["message"] == "Reporte enviado correctamente"
    assert UUID(c["report_id"]).version == 4
    assert c["report_id"] == c["report_id"].lower()
    assert c["report_number"] == "#00001"
    assert c["category"] == "calle_anegada"
    assert c["category_label"] == "Calle anegada"
    assert c["location"] == {"latitude": INSIDE[0], "longitude": INSIDE[1], "address_reference": FIXED_ADDRESS}
    assert ISO_MS_Z.match(c["created_at"])
    assert c["status"] == "pendiente"
    assert c["status_label"] == "Pendiente"
    assert c["status_message"] == "El aviso fue recibido."
    assert c["photo_url"] is None


def test_create_report_persists_report_and_initial_history(client, ctx):
    response = post_report(client, ctx.citizen["id"])
    report_id = UUID(response.json()["confirmation"]["report_id"])
    stored = ctx.repo.reports[report_id]
    assert stored["citizen_id"] == ctx.citizen["id"]
    assert stored["address_reference"] == FIXED_ADDRESS
    history = [h for h in ctx.repo.history if h["report_id"] == report_id]
    assert len(history) == 1
    assert history[0]["previous_status"] is None
    assert history[0]["new_status"] == "pendiente"
    assert history[0]["changed_by"] == ctx.citizen["id"]
    assert ctx.geocoder.calls == 1


def test_report_numbers_are_sequential(client, ctx):
    numbers = [post_report(client, ctx.citizen["id"]).json()["confirmation"]["report_number"] for _ in range(3)]
    assert numbers == ["#00001", "#00002", "#00003"]


def test_create_report_with_photo_and_no_comment(client, ctx):
    response = post_report(client, ctx.citizen["id"], comment=None, photo=make_image("JPEG", (4000, 3000)))
    assert response.status_code == 201, response.text
    c = response.json()["confirmation"]
    path = next(iter(ctx.storage_client.uploaded))
    assert re.match(rf"^reports/\d{{4}}/\d{{2}}/{c['report_id']}_[0-9a-f]{{8}}\.webp$", path)
    assert c["photo_url"].endswith(path)
    assert "incident-photos" in c["photo_url"]
    assert ctx.storage_client.buckets == ["incident-photos"]
    content, options = ctx.storage_client.uploaded[path]
    assert options["content-type"] == "image/webp"
    assert content[:4] == b"RIFF" and content[8:12] == b"WEBP"


def test_admin_can_create_report(client, ctx):
    assert post_report(client, ctx.admin["id"]).status_code == 201


@pytest.mark.parametrize("comment", [None, "", "    "])
def test_missing_photo_and_comment_returns_422(client, ctx, comment):
    response = post_report(client, ctx.citizen["id"], comment=comment)
    err = assert_error(response, 422, "COMMENT_OR_PHOTO_REQUIRED")
    assert err["message"] == "Debe proporcionar una fotografía o redactar un comentario descriptivo de la situación."
    assert err["details"] is None
    assert ctx.repo.reports == {}


def test_categoria_otro_requires_comment_without_photo(client, ctx):
    assert_error(post_report(client, ctx.citizen["id"], category="otro", comment=None), 422, "COMMENT_OR_PHOTO_REQUIRED")
    assert post_report(client, ctx.citizen["id"], category="otro", comment="Animales sueltos").status_code == 201
    assert post_report(client, ctx.citizen["id"], category="otro", comment=None, photo=make_image()).status_code == 201


def test_outside_territory_returns_422(client, ctx):
    response = post_report(client, ctx.citizen["id"], lat=ASUNCION[0], lon=ASUNCION[1])
    err = assert_error(response, 422, "OUTSIDE_TERRITORY")
    assert err["message"] == "La ubicación seleccionada se encuentra fuera del territorio provincial de Formosa."
    assert err["details"] == {"latitude": ASUNCION[0], "longitude": ASUNCION[1]}
    assert ctx.repo.reports == {}
    assert ctx.storage_client.uploaded == {}


def test_outside_territory_does_not_upload_photo(client, ctx):
    response = post_report(client, ctx.citizen["id"], lat=-25.2987, lon=-56.8921, photo=make_image())
    assert_error(response, 422, "OUTSIDE_TERRITORY")
    assert ctx.storage_client.uploaded == {}


@pytest.mark.parametrize("category", ["inundacion", "", "CALLE_ANEGADA"])
def test_invalid_category_returns_400(client, ctx, category):
    assert_error(post_report(client, ctx.citizen["id"], category=category), 400, "INVALID_INPUT")


@pytest.mark.parametrize("lat,lon", [("abc", "-58.17"), ("-95", "-58.17"), ("-26.18", "-190")])
def test_invalid_coordinates_return_400(client, ctx, lat, lon):
    assert_error(post_report(client, ctx.citizen["id"], lat=lat, lon=lon), 400, "INVALID_INPUT")


def test_missing_required_fields_returns_400(client, ctx):
    response = client.post("/api/v1/reports", data={"comment": "hola"}, headers=auth_header(ctx.citizen["id"]))
    assert_error(response, 400, "INVALID_INPUT")


def test_comment_longer_than_1000_returns_400(client, ctx):
    assert_error(post_report(client, ctx.citizen["id"], comment="x" * 1001), 400, "INVALID_INPUT")
    assert post_report(client, ctx.citizen["id"], comment="x" * 1000).status_code == 201


def test_photo_with_fake_extension_is_rejected(client, ctx):
    response = post_report(client, ctx.citizen["id"], photo=b"%PDF-1.7 not an image", photo_name="foto.jpg")
    assert_error(response, 400, "INVALID_INPUT")
    assert ctx.repo.reports == {}


def test_photo_larger_than_5mb_is_rejected(client, ctx):
    big = b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024)
    assert_error(post_report(client, ctx.citizen["id"], photo=big), 400, "INVALID_INPUT")


@pytest.mark.parametrize("fmt", ["JPEG", "PNG", "WEBP"])
def test_allowed_photo_formats(client, ctx, fmt):
    assert post_report(client, ctx.citizen["id"], comment=None, photo=make_image(fmt)).status_code == 201


def test_photo_is_removed_if_database_insert_fails(client, ctx):
    ctx.repo.fail_on_create = True
    from fastapi.testclient import TestClient

    from main import app

    with TestClient(app, raise_server_exceptions=False) as c:
        response = post_report(c, ctx.citizen["id"], photo=make_image())
    assert_error(response, 500, "INTERNAL_SERVER_ERROR")
    assert ctx.storage_client.uploaded == {}
    assert len(ctx.storage_client.removed) == 1


def test_create_report_requires_auth(client):
    assert_error(post_report(client, None, headers={}), 401, "AUTH_REQUIRED")


def test_report_submit_rate_limit_is_5_per_minute_per_user(client, ctx):
    for _ in range(5):
        assert post_report(client, ctx.citizen["id"]).status_code == 201
    assert_error(post_report(client, ctx.citizen["id"]), 429, "RATE_LIMIT_EXCEEDED")
    # El límite es por usuario: otro ciudadano todavía puede enviar.
    assert post_report(client, ctx.other_citizen["id"]).status_code == 201


# --- GET /reports/me ---
def test_my_reports_lists_only_own_reports_newest_first(client, ctx):
    first = post_report(client, ctx.citizen["id"]).json()["confirmation"]["report_id"]
    post_report(client, ctx.other_citizen["id"])
    second = post_report(client, ctx.citizen["id"], category="arbol_caido").json()["confirmation"]["report_id"]

    response = client.get("/api/v1/reports/me", headers=auth_header(ctx.citizen["id"]))
    assert response.status_code == 200
    body = response.json()
    assert [i["id"] for i in body["items"]] == [second, first]
    item = body["items"][0]
    assert set(item) == {"id", "report_number", "category", "category_label", "color", "photo_url", "location",
                         "created_at", "current_status", "current_status_label"}
    assert item["category_label"] == "Árbol caído"
    assert item["color"] == "#558B2F"
    assert item["current_status"] == "pendiente"
    assert item["current_status_label"] == "Pendiente"
    assert body["pagination"] == {"page": 1, "page_size": 20, "total_items": 2, "total_pages": 1,
                                  "has_next": False, "has_prev": False}


def test_my_reports_pagination(client, ctx):
    for _ in range(5):  # 5 = límite por minuto; el limitador se reinicia en cada test
        assert post_report(client, ctx.admin["id"]).status_code == 201
    response = client.get("/api/v1/reports/me?page=2&page_size=2", headers=auth_header(ctx.admin["id"]))
    body = response.json()
    assert len(body["items"]) == 2
    assert body["pagination"] == {"page": 2, "page_size": 2, "total_items": 5, "total_pages": 3,
                                  "has_next": True, "has_prev": True}


def test_my_reports_empty(client, ctx):
    body = client.get("/api/v1/reports/me", headers=auth_header(ctx.citizen["id"])).json()
    assert body["items"] == []
    assert body["pagination"]["total_items"] == 0
    assert body["pagination"]["has_next"] is False


@pytest.mark.parametrize("query", ["page=0", "page_size=0", "page_size=101", "page=abc"])
def test_my_reports_invalid_pagination(client, ctx, query):
    assert_error(client.get(f"/api/v1/reports/me?{query}", headers=auth_header(ctx.citizen["id"])), 400, "INVALID_INPUT")


def test_my_reports_requires_auth(client):
    assert_error(client.get("/api/v1/reports/me"), 401, "AUTH_REQUIRED")


# --- GET /reports/me/{report_id} ---
def _advance(client, ctx, report_id, steps):
    for status, comment in steps:
        r = client.patch(f"/api/v1/admin/reports/{report_id}/status",
                         json={"new_status": status, "admin_comment": comment}, headers=auth_header(ctx.admin["id"]))
        assert r.status_code == 200, r.text


def test_my_report_detail_with_timeline(client, ctx):
    report_id = post_report(client, ctx.citizen["id"]).json()["confirmation"]["report_id"]
    _advance(client, ctx, report_id, [("en_revision", "Cuadrilla de Defensa Civil en camino para evaluar motobombas.")])

    response = client.get(f"/api/v1/reports/me/{report_id}", headers=auth_header(ctx.citizen["id"]))
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"id", "report_number", "category", "category_label", "color", "photo_url", "comment",
                         "location", "current_status", "current_status_label", "timeline"}
    assert body["comment"] == "El agua supera la vereda e ingresa a los domicilios."
    assert body["location"] == {
        "latitude": INSIDE[0], "longitude": INSIDE[1], "address_reference": FIXED_ADDRESS,
        "display_text": f"{FIXED_ADDRESS} ({INSIDE[0]}, {INSIDE[1]})",
    }
    assert body["current_status"] == "en_revision"
    assert body["current_status_label"] == "En revisión"
    assert body["timeline"] == [
        {"step_order": 1, "status": "pendiente", "title": "Reporte recibido", "description": "El aviso fue recibido.",
         "admin_comment": None, "timestamp": body["timeline"][0]["timestamp"]},
        {"step_order": 2, "status": "en_revision", "title": "En revisión",
         "description": "Se está revisando el reporte.",
         "admin_comment": "Cuadrilla de Defensa Civil en camino para evaluar motobombas.",
         "timestamp": body["timeline"][1]["timestamp"]},
    ]
    assert body["timeline"][0]["timestamp"] < body["timeline"][1]["timestamp"]


def test_timeline_full_lifecycle_in_chronological_order(client, ctx):
    report_id = post_report(client, ctx.citizen["id"]).json()["confirmation"]["report_id"]
    _advance(client, ctx, report_id, [("en_revision", "Evaluando"), ("verificado", None),
                                      ("en_seguimiento", "Cuadrilla enviada"), ("resuelto", None)])
    timeline = client.get(f"/api/v1/reports/me/{report_id}", headers=auth_header(ctx.citizen["id"])).json()["timeline"]
    assert [t["step_order"] for t in timeline] == [1, 2, 3, 4, 5]
    assert [t["status"] for t in timeline] == ["pendiente", "en_revision", "verificado", "en_seguimiento", "resuelto"]
    assert [t["timestamp"] for t in timeline] == sorted(t["timestamp"] for t in timeline)


def test_my_report_detail_of_other_citizen_is_not_found(client, ctx):
    report_id = post_report(client, ctx.other_citizen["id"]).json()["confirmation"]["report_id"]
    assert_error(client.get(f"/api/v1/reports/me/{report_id}", headers=auth_header(ctx.citizen["id"])),
                 404, "REPORT_NOT_FOUND")


def test_admin_can_view_any_report_detail(client, ctx):
    report_id = post_report(client, ctx.citizen["id"]).json()["confirmation"]["report_id"]
    assert client.get(f"/api/v1/reports/me/{report_id}", headers=auth_header(ctx.admin["id"])).status_code == 200


def test_my_report_detail_not_found_and_invalid_id(client, ctx):
    assert_error(client.get(f"/api/v1/reports/me/{uuid4()}", headers=auth_header(ctx.citizen["id"])),
                 404, "REPORT_NOT_FOUND")
    assert_error(client.get("/api/v1/reports/me/not-a-uuid", headers=auth_header(ctx.citizen["id"])),
                 400, "INVALID_INPUT")
