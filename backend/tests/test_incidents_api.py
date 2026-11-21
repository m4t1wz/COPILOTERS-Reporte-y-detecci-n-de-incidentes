"""Endpoints públicos /api/v1/incidents (docs/02. system-contracts.md §4)."""
from datetime import timedelta
from uuid import uuid4

import pytest

from schemas.common import iso_utc
from tests.conftest import FIXED_ADDRESS, assert_error, auth_header, make_image, post_report


def _set_status(ctx, report_id, status):
    ctx.repo.reports[report_id]["current_status"] = status


def _create(client, ctx, **kwargs):
    from uuid import UUID

    return UUID(post_report(client, ctx.citizen["id"], **kwargs).json()["confirmation"]["report_id"])


def test_incidents_are_public_geojson(client, ctx):
    rid = _create(client, ctx, lat=-26.18523456, lon=-58.17381234, photo=make_image())
    _set_status(ctx, rid, "verificado")
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    feature = body["features"][0]
    assert set(feature) == {"type", "id", "geometry", "properties"}
    assert feature["type"] == "Feature"
    assert feature["id"] == str(rid)
    assert feature["geometry"] == {"type": "Point", "coordinates": [-58.1738, -26.1852]}
    props = feature["properties"]
    assert set(props) == {"report_id", "report_number", "category", "category_label", "color", "status",
                          "status_label", "address_reference", "photo_url", "has_photo", "created_at"}
    assert props["report_id"] == str(rid)
    assert props["report_number"] == "#00001"
    assert props["category"] == "calle_anegada"
    assert props["category_label"] == "Calle anegada"
    assert props["color"] == "#2196F3"
    assert props["status"] == "verificado"
    assert props["status_label"] == "Verificado"
    assert props["address_reference"] == FIXED_ADDRESS
    assert props["has_photo"] is True
    assert props["photo_url"].startswith("https://")


def test_incidents_never_expose_citizen_identity(client, ctx):
    _set_status(ctx, _create(client, ctx), "verificado")
    text = client.get("/api/v1/incidents").text
    assert str(ctx.citizen["id"]) not in text
    assert ctx.citizen["full_name"] not in text
    assert ctx.citizen["phone_number"] not in text


def _all_statuses(client, ctx):
    for status in ["pendiente", "en_revision", "verificado", "en_seguimiento", "resuelto"]:
        _set_status(ctx, _create(client, ctx), status)


def test_public_default_returns_only_verified(client, ctx):
    _all_statuses(client, ctx)
    statuses = {f["properties"]["status"] for f in client.get("/api/v1/incidents").json()["features"]}
    assert statuses == {"verificado", "en_seguimiento"}


@pytest.mark.parametrize("status", ["pendiente", "en_revision", "resuelto"])
def test_public_cannot_request_unverified_status(client, ctx, status):
    _all_statuses(client, ctx)
    assert client.get(f"/api/v1/incidents?status={status}").json()["features"] == []


def test_admin_default_returns_all_active(client, ctx):
    _all_statuses(client, ctx)
    response = client.get("/api/v1/incidents", headers=auth_header(ctx.admin["id"]))
    statuses = {f["properties"]["status"] for f in response.json()["features"]}
    assert statuses == {"pendiente", "en_revision", "verificado", "en_seguimiento"}


def test_citizen_token_does_not_unlock_unverified(client, ctx):
    _all_statuses(client, ctx)
    response = client.get("/api/v1/incidents", headers=auth_header(ctx.citizen["id"]))
    assert {f["properties"]["status"] for f in response.json()["features"]} == {"verificado", "en_seguimiento"}


def test_descartado_is_excluded_by_default(client, ctx):
    rid = _create(client, ctx)
    _set_status(ctx, rid, "descartado")
    assert client.get("/api/v1/incidents").json()["features"] == []


def test_status_filter(client, ctx):
    a = _create(client, ctx)
    _create(client, ctx)
    _set_status(ctx, a, "verificado")
    features = client.get("/api/v1/incidents?status=verificado").json()["features"]
    assert [f["id"] for f in features] == [str(a)]
    assert features[0]["properties"]["status_label"] == "Verificado"


def test_category_filter(client, ctx):
    _set_status(ctx, _create(client, ctx), "verificado")
    tree = _create(client, ctx, category="arbol_caido")
    _set_status(ctx, tree, "verificado")
    features = client.get("/api/v1/incidents?category=arbol_caido").json()["features"]
    assert [f["id"] for f in features] == [str(tree)]
    assert features[0]["properties"]["color"] == "#558B2F"


def test_bbox_filter(client, ctx):
    capital = _create(client, ctx)
    clorinda = _create(client, ctx, lat=-25.2870, lon=-57.7230)
    _set_status(ctx, capital, "verificado")
    _set_status(ctx, clorinda, "verificado")
    features = client.get("/api/v1/incidents?bbox=-58.3,-26.3,-58.0,-26.0").json()["features"]
    assert [f["id"] for f in features] == [str(capital)]
    features = client.get("/api/v1/incidents?bbox=-57.8,-25.4,-57.6,-25.2").json()["features"]
    assert [f["id"] for f in features] == [str(clorinda)]


@pytest.mark.parametrize("bbox", ["1,2,3", "a,b,c,d", "-58,-26,-59,-25", "-200,-26,-58,-25"])
def test_invalid_bbox_returns_400(client, bbox):
    assert_error(client.get(f"/api/v1/incidents?bbox={bbox}"), 400, "INVALID_INPUT")


def test_date_filters(client, ctx):
    first = _create(client, ctx)
    second = _create(client, ctx)
    _set_status(ctx, first, "verificado")
    _set_status(ctx, second, "verificado")
    t1 = ctx.repo.reports[first]["created_at"]
    t2 = ctx.repo.reports[second]["created_at"]
    start = iso_utc(t2 - timedelta(milliseconds=1))
    end = iso_utc(t1 + timedelta(milliseconds=1))
    assert [f["id"] for f in client.get(f"/api/v1/incidents?start_date={start}").json()["features"]] == [str(second)]
    assert [f["id"] for f in client.get(f"/api/v1/incidents?end_date={end}").json()["features"]] == [str(first)]


@pytest.mark.parametrize("query", ["category=inundacion", "status=activo", "start_date=ayer"])
def test_invalid_enum_or_date_returns_400(client, query):
    assert_error(client.get(f"/api/v1/incidents?{query}"), 400, "INVALID_INPUT")


def test_incident_detail(client, ctx):
    rid = _create(client, ctx, lat=-26.18523456, lon=-58.17381234)
    _set_status(ctx, rid, "verificado")
    response = client.get(f"/api/v1/incidents/{rid}")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"id", "report_number", "category", "category_label", "color", "status", "status_label",
                         "location", "photo_url", "created_at"}
    assert body["location"] == {"latitude": -26.1852, "longitude": -58.1738, "address_reference": FIXED_ADDRESS}
    assert body["report_number"] == "#00001"
    assert body["photo_url"] is None


def test_incident_detail_not_found(client, ctx):
    assert_error(client.get(f"/api/v1/incidents/{uuid4()}"), 404, "REPORT_NOT_FOUND")
    assert_error(client.get("/api/v1/incidents/123"), 400, "INVALID_INPUT")
    rid = _create(client, ctx)
    _set_status(ctx, rid, "descartado")
    assert_error(client.get(f"/api/v1/incidents/{rid}"), 404, "REPORT_NOT_FOUND")


def test_unverified_detail_is_hidden_from_public_but_not_admin(client, ctx):
    rid = _create(client, ctx)
    assert_error(client.get(f"/api/v1/incidents/{rid}"), 404, "REPORT_NOT_FOUND")
    admin = client.get(f"/api/v1/incidents/{rid}", headers=auth_header(ctx.admin["id"]))
    assert admin.status_code == 200 and admin.json()["status"] == "pendiente"


def test_clusters_empty(client):
    response = client.get("/api/v1/incidents/clusters")
    assert response.status_code == 200
    assert response.json() == {"type": "FeatureCollection", "features": []}


def test_clusters_generated_after_verification(client, ctx):
    """07 TASK-BE-06: 3 reportes a ~200 m en el centro de Formosa → 1 polígono."""
    offsets = [(0.0, 0.0), (0.0018, 0.0), (0.0, 0.0018)]  # ~200 m
    ids = [_create(client, ctx, lat=-26.1852 + dlat, lon=-58.1738 + dlon) for dlat, dlon in offsets]
    admin = auth_header(ctx.admin["id"])
    for rid in ids:
        assert client.patch(f"/api/v1/admin/reports/{rid}/status",
                            json={"new_status": "en_revision", "admin_comment": "Evaluando"}, headers=admin).status_code == 200
        assert client.patch(f"/api/v1/admin/reports/{rid}/status",
                            json={"new_status": "verificado"}, headers=admin).status_code == 200

    body = client.get("/api/v1/incidents/clusters").json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) == 1
    feature = body["features"][0]
    assert set(feature) == {"type", "id", "geometry", "properties"}
    assert feature["geometry"]["type"] == "Polygon"
    ring = feature["geometry"]["coordinates"][0]
    assert ring[0] == ring[-1]
    props = feature["properties"]
    assert set(props) == {"cluster_id", "category", "category_label", "color", "incident_count", "window_start",
                          "window_end", "description"}
    assert feature["id"] == props["cluster_id"]
    assert props["category"] == "calle_anegada"
    assert props["category_label"] == "Calle anegada"
    assert props["color"] == "#2196F3"
    assert props["incident_count"] == 3
    assert props["window_start"] <= props["window_end"]
    assert props["description"] == "Zona de concentración de calle anegada (3 reportes activos)"

    # Al resolverse uno de los reportes, la zona deja de cumplir el mínimo y se desactiva.
    assert client.patch(f"/api/v1/admin/reports/{ids[0]}/status", json={"new_status": "resuelto"},
                        headers=admin).status_code == 200
    assert client.get("/api/v1/incidents/clusters").json()["features"] == []


def test_incidents_do_not_require_auth_even_with_bad_token(client, ctx):
    _create(client, ctx)
    assert client.get("/api/v1/incidents", headers={"Authorization": "Bearer x"}).status_code == 200
    assert client.get("/api/v1/incidents", headers=auth_header(ctx.citizen["id"])).status_code == 200
