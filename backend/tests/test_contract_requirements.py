"""Requisitos del archivo de especificación (versión NEXO MAP) que no tenían una prueba dedicada."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from tests.conftest import INSIDE, assert_error, auth_header, make_image


def _iso_to_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def test_created_at_is_generated_by_server_and_client_value_is_ignored(client, ctx):
    """02 §5 regla 6: la fecha y hora son generadas automáticamente por el servidor."""
    response = client.post(
        "/api/v1/reports",
        data={"category": "calle_anegada", "latitude": str(INSIDE[0]), "longitude": str(INSIDE[1]),
              "comment": "Agua en la calle", "created_at": "2000-01-01T00:00:00.000Z"},
        headers=auth_header(ctx.citizen["id"]),
    )
    assert response.status_code == 201, response.text
    created = _iso_to_dt(response.json()["confirmation"]["created_at"])
    assert created.year != 2000
    assert abs(created - datetime.now(timezone.utc)) < timedelta(hours=2)


def test_true_multipart_without_photo(client, ctx):
    """02 §5: Content-Type multipart/form-data con los campos category, latitude, longitude, comment."""
    files = {
        "category": (None, "camino_interrumpido"),
        "latitude": (None, str(INSIDE[0])),
        "longitude": (None, str(INSIDE[1])),
        "comment": (None, "Ruta cortada por el agua."),
    }
    response = client.post("/api/v1/reports", files=files, headers=auth_header(ctx.citizen["id"]))
    assert response.status_code == 201, response.text
    assert response.json()["confirmation"]["category_label"] == "Camino interrumpido"


def test_true_multipart_without_photo_and_comment_is_rejected(client, ctx):
    files = {"category": (None, "otro"), "latitude": (None, str(INSIDE[0])), "longitude": (None, str(INSIDE[1]))}
    assert_error(client.post("/api/v1/reports", files=files, headers=auth_header(ctx.citizen["id"])),
                 422, "COMMENT_OR_PHOTO_REQUIRED")


def test_admin_reports_page_size_limits(client, ctx):
    headers = auth_header(ctx.admin["id"])
    assert client.get("/api/v1/admin/reports?page_size=100", headers=headers).status_code == 200
    assert_error(client.get("/api/v1/admin/reports?page_size=101", headers=headers), 400, "INVALID_INPUT")
    assert_error(client.get("/api/v1/admin/reports?page=0", headers=headers), 400, "INVALID_INPUT")


def _verify(client, ctx, report_id):
    headers = auth_header(ctx.admin["id"])
    assert client.patch(f"/api/v1/admin/reports/{report_id}/status",
                        json={"new_status": "en_revision", "admin_comment": "Evaluando"}, headers=headers).status_code == 200
    assert client.patch(f"/api/v1/admin/reports/{report_id}/status",
                        json={"new_status": "verificado"}, headers=headers).status_code == 200


def test_clusters_ignore_reports_older_than_10_days(client, ctx):
    """02 §4 Clusters: reportes coincidentes en categoría y con antigüedad menor a 10 días."""
    ids = []
    for dlat in (0.0, 0.0010, 0.0020):
        r = client.post("/api/v1/reports", data={"category": "calle_anegada", "latitude": str(INSIDE[0] + dlat),
                                                 "longitude": str(INSIDE[1]), "comment": "Agua"},
                        headers=auth_header(ctx.citizen["id"]))
        ids.append(UUID(r.json()["confirmation"]["report_id"]))
    # Uno de los tres reportes tiene 11 días de antigüedad.
    ctx.repo.reports[ids[0]]["created_at"] -= timedelta(days=11)
    for rid in ids:
        _verify(client, ctx, rid)
    assert client.get("/api/v1/incidents/clusters").json()["features"] == []

    # Con un cuarto reporte reciente vuelven a ser 3 dentro de la ventana.
    r = client.post("/api/v1/reports", data={"category": "calle_anegada", "latitude": str(INSIDE[0] + 0.0015),
                                             "longitude": str(INSIDE[1]), "comment": "Agua"},
                    headers=auth_header(ctx.citizen["id"]))
    _verify(client, ctx, r.json()["confirmation"]["report_id"])
    features = client.get("/api/v1/incidents/clusters").json()["features"]
    assert len(features) == 1
    assert features[0]["properties"]["incident_count"] == 3


def test_end_to_end_citizen_admin_flow(client, ctx):
    """07 TASK-INT-02: registro, reporte con foto, confirmación, gestión admin y timeline del ciudadano."""
    # 1. El ciudadano explora el mapa sin sesión.
    assert client.get("/api/v1/incidents").status_code == 200
    # 2. Se registra e inicia sesión.
    creds = {"email": "vecina@example.com", "password": "ClaveDePrueba123!"}
    assert client.post("/api/v1/auth/register", json={**creds, "full_name": "Vecina de Prueba"}).status_code == 201
    login = client.post("/api/v1/auth/login", json=creds)
    assert login.status_code == 200
    token = login.json()["session"]["access_token"]
    citizen = {"Authorization": f"Bearer {token}"}
    # 3. Reporta una calle anegada con foto y GPS; recibe la tarjeta #00000.
    created = client.post(
        "/api/v1/reports",
        data={"category": "calle_anegada", "latitude": str(INSIDE[0]), "longitude": str(INSIDE[1])},
        files={"photo": ("calle.jpg", make_image(), "image/jpeg")},
        headers=citizen,
    )
    assert created.status_code == 201, created.text
    card = created.json()["confirmation"]
    assert card["report_number"] == "#00001" and card["status"] == "pendiente"
    report_id = card["report_id"]
    # El reporte es consultable en el mapa público y en «Mis reportes».
    assert client.get(f"/api/v1/incidents/{report_id}").json()["status"] == "pendiente"
    assert client.get("/api/v1/reports/me", headers=citizen).json()["items"][0]["id"] == report_id
    # 4. El administrador lo ve en el panel.
    admin = auth_header(ctx.admin["id"])
    listed = client.get("/api/v1/admin/reports?status=pendiente", headers=admin).json()["items"]
    assert [i["id"] for i in listed] == [report_id]
    # 5. Lo verifica y agrega el comentario "Cuadrilla enviada".
    r1 = client.patch(f"/api/v1/admin/reports/{report_id}/status",
                      json={"new_status": "en_revision", "admin_comment": "Cuadrilla enviada"}, headers=admin)
    assert r1.status_code == 200 and r1.json()["current_status"] == "en_revision"
    r2 = client.patch(f"/api/v1/admin/reports/{report_id}/status", json={"new_status": "verificado"}, headers=admin)
    assert r2.status_code == 200 and r2.json()["previous_status"] == "en_revision"
    # El cambio queda en el historial con el operador responsable.
    history = client.get(f"/api/v1/admin/reports/{report_id}/history", headers=admin).json()["history"]
    assert [h["new_status"] for h in history] == ["pendiente", "en_revision", "verificado"]
    assert history[1]["admin_comment"] == "Cuadrilla enviada"
    assert history[1]["changed_by"]["role"] == "admin"
    assert history[1]["changed_by"]["name"] == ctx.admin["full_name"]
    # 6. El ciudadano ve la actualización en el timeline.
    detail = client.get(f"/api/v1/reports/me/{report_id}", headers=citizen).json()
    assert detail["current_status"] == "verificado"
    assert [t["title"] for t in detail["timeline"]] == ["Reporte recibido", "En revisión", "Verificado"]
    assert detail["timeline"][1]["admin_comment"] == "Cuadrilla enviada"
    # El dashboard lo contabiliza.
    stats = client.get("/api/v1/admin/dashboard/stats", headers=admin).json()
    assert stats["total_reports"] == 1 and stats["verified_reports"] == 1
