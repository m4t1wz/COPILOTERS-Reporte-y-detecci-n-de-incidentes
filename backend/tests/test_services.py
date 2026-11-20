"""Servicios de dominio y aspectos transversales: geocodificación, fotos, clusters, semilla, errores, CORS."""
import asyncio
import io
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from PIL import Image

from core.config import settings
from core.exceptions import InvalidInputException
from services import cluster_service, geo_service, storage_service
from services.geocoding_service import GeocodingService, fallback_reference
from tests.conftest import assert_error, make_image


# --- Geodecodificación inversa (03 §4.2) ---
NOMINATIM_PAYLOAD = {
    "display_name": "Avenida 25 de Mayo, Formosa, Argentina",
    "address": {"road": "Avenida 25 de Mayo", "house_number": "500", "city": "Formosa"},
}


def test_geocoding_formats_address_and_uses_cache():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=NOMINATIM_PAYLOAD)

    service = GeocodingService(transport=httpx.MockTransport(handler))
    assert asyncio.run(service.reverse_geocode(-26.18521, -58.17381)) == "Avenida 25 de Mayo 500, Formosa"
    # Misma coordenada redondeada a 4 decimales → caché, sin nueva consulta.
    assert asyncio.run(service.reverse_geocode(-26.18524, -58.17379)) == "Avenida 25 de Mayo 500, Formosa"
    assert len(calls) == 1
    assert calls[0].headers["User-Agent"] == "nexo-map-api"
    assert calls[0].url.host == "nominatim.openstreetmap.org"


@pytest.mark.parametrize("handler", [
    lambda request: httpx.Response(503),
    lambda request: (_ for _ in ()).throw(httpx.ConnectError("caído")),
    lambda request: httpx.Response(200, json={}),
])
def test_geocoding_fallback(handler):
    service = GeocodingService(transport=httpx.MockTransport(handler))
    assert asyncio.run(service.reverse_geocode(-26.1852, -58.1738)) == "Ubicación Formosa (-26.1852, -58.1738)"


def test_geocoding_timeout_falls_back():
    # MockTransport no aplica los timeouts de httpx (conexión 3 s, respuesta 1,5 s); se prueba el tope total.
    async def slow(request):
        await asyncio.sleep(6)
        return httpx.Response(200, json=NOMINATIM_PAYLOAD)

    service = GeocodingService(transport=httpx.MockTransport(slow))
    start = datetime.now()
    assert asyncio.run(service.reverse_geocode(-26.1852, -58.1738)) == fallback_reference(-26.1852, -58.1738)
    assert (datetime.now() - start).total_seconds() < 7  # tope total de 6 s (Nominatim + Photon)


def test_geocoding_uses_photon_when_nominatim_rate_limits():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if request.url.host == "nominatim.openstreetmap.org":
            return httpx.Response(429)
        return httpx.Response(200, json={"features": [{"properties": {
            "street": "Jose Maria Uriburu", "city": "Formosa", "state": "Formosa"}}]})

    service = GeocodingService(transport=httpx.MockTransport(handler))

    async def run():
        first = await service.reverse_geocode(-26.1852, -58.1738)
        second = await service.reverse_geocode(-26.1900, -58.1800)  # Nominatim en pausa tras el 429
        return first, second

    first, second = asyncio.run(run())
    assert first == second == "Jose Maria Uriburu, Formosa"
    assert calls == ["nominatim.openstreetmap.org", "photon.komoot.io", "photon.komoot.io"]


def test_photon_street_result_uses_name():
    from services.geocoding_service import format_photon_address

    payload = {"features": [{"properties": {"type": "street", "name": "Juan Somacal", "city": "Formosa"}}]}
    assert format_photon_address(payload) == "Juan Somacal, Formosa"
    poi = {"features": [{"properties": {"type": "house", "name": "Anchico Blanco", "street": "Jose Maria Uriburu",
                                        "city": "Formosa"}}]}
    assert format_photon_address(poi) == "Jose Maria Uriburu, Formosa"


def test_geocoding_timeouts_separate_connect_from_response():
    service = GeocodingService(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=NOMINATIM_PAYLOAD)))

    async def run():
        await service.reverse_geocode(-26.1852, -58.1738)
        first = service._client
        await service.reverse_geocode(-25.2870, -57.7230)
        timeout = service._client.timeout
        same = service._client is first
        await service.aclose()
        return same, timeout

    same_client, timeout = asyncio.run(run())
    assert same_client  # conexión reutilizada (keep-alive) entre consultas
    assert timeout.connect == 3.0 and timeout.read == 1.5


# --- Fotografías (03 §4.3) ---
def test_detect_image_mime():
    assert storage_service.detect_image_mime(make_image("JPEG")) == "image/jpeg"
    assert storage_service.detect_image_mime(make_image("PNG")) == "image/png"
    assert storage_service.detect_image_mime(make_image("WEBP")) == "image/webp"
    assert storage_service.detect_image_mime(make_image("GIF")) is None
    assert storage_service.detect_image_mime(b"<svg></svg>") is None


def test_validate_photo_rejects_gif_and_oversized():
    with pytest.raises(InvalidInputException):
        storage_service.validate_photo(make_image("GIF"))
    with pytest.raises(InvalidInputException):
        storage_service.validate_photo(b"\x89PNG\r\n\x1a\n" + b"0" * (5 * 1024 * 1024))


def test_optimize_photo_resizes_and_strips_exif():
    img = Image.new("RGB", (4000, 3000), (10, 20, 30))
    exif = Image.Exif()
    exif[0x010F] = "CamaraDePrueba"  # Make
    exif[0x8825] = {2: (26.0, 11.0, 6.0)}  # GPSInfo
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)

    out = storage_service.optimize_photo(buf.getvalue())
    with Image.open(io.BytesIO(out)) as result:
        assert result.format == "WEBP"
        assert result.width <= 1920 and result.height <= 1080
        assert result.size == (1440, 1080)
        assert not result.getexif()


def test_optimize_photo_applies_orientation():
    img = Image.new("RGB", (400, 200))
    exif = Image.Exif()
    exif[0x0112] = 6  # rotar 90°
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    with Image.open(io.BytesIO(storage_service.optimize_photo(buf.getvalue()))) as result:
        assert result.size == (200, 400)


def test_corrupted_image_rejected():
    with pytest.raises(InvalidInputException):
        storage_service.optimize_photo(b"\xff\xd8\xff" + b"basura")


# --- Clusters (03 §4.5) ---
NOW = datetime(2026, 11, 18, 15, 0, tzinfo=timezone.utc)
BASE = (-26.1852, -58.1738)


def _report(category="calle_anegada", dlat=0.0, dlon=0.0, days_ago=1, status="verificado"):
    return {"category": category, "latitude": BASE[0] + dlat, "longitude": BASE[1] + dlon,
            "created_at": NOW - timedelta(days=days_ago), "current_status": status}


def test_three_close_reports_form_one_cluster():
    reports = [_report(), _report(dlat=0.0018), _report(dlon=0.0018, status="en_seguimiento")]
    clusters = cluster_service.compute_clusters(reports, NOW)
    assert len(clusters) == 1
    c = clusters[0]
    assert c.category == "calle_anegada"
    assert c.incident_count == 3
    assert c.polygon.geom_type == "Polygon" and c.polygon.is_valid
    for r in reports:
        from shapely.geometry import Point

        assert c.polygon.contains(Point(r["longitude"], r["latitude"]))
    assert c.window_start == min(r["created_at"] for r in reports)
    assert c.window_end == max(r["created_at"] for r in reports)


def test_collinear_reports_get_buffered_polygon():
    reports = [_report(dlat=0.001 * i) for i in range(3)]
    clusters = cluster_service.compute_clusters(reports, NOW)
    assert len(clusters) == 1
    assert clusters[0].polygon.area > 0


@pytest.mark.parametrize("reports", [
    [_report(), _report(dlat=0.0018)],                                                  # solo 2
    [_report(), _report(dlat=0.0018), _report(dlon=0.0018, category="arbol_caido")],    # categoría distinta
    [_report(), _report(dlat=0.0018), _report(dlon=0.02)],                              # ~2 km
    [_report(), _report(dlat=0.0018), _report(dlon=0.0018, days_ago=11)],               # > 10 días
    [_report(), _report(dlat=0.0018), _report(dlon=0.0018, status="pendiente")],        # estado no elegible
    [_report(), _report(dlat=0.0018), _report(dlon=0.0018, status="resuelto")],
])
def test_no_cluster_when_criteria_not_met(reports):
    assert cluster_service.compute_clusters(reports, NOW) == []


def test_two_categories_two_clusters():
    reports = [_report(dlat=0.0005 * i) for i in range(3)] + [
        _report(category="desborde_rio_riacho", dlat=0.0005 * i) for i in range(4)]
    clusters = cluster_service.compute_clusters(reports, NOW)
    assert sorted((c.category, c.incident_count) for c in clusters) == [("calle_anegada", 3), ("desborde_rio_riacho", 4)]


def test_dbscan_eps_is_800_meters():
    assert cluster_service.EPS_METERS == 800 and cluster_service.MIN_SAMPLES == 3
    # ~790 m y ~810 m respecto del primer punto (1° lat ≈ 111.2 km)
    near = [(0.0, 0.0), (0.0071, 0.0), (-0.0071, 0.0)]
    assert cluster_service.dbscan([(BASE[0] + a, BASE[1] + b) for a, b in near]) == [[0, 1, 2]]
    far = [(0.0, 0.0), (0.0073, 0.0), (0.0146, 0.0)]
    assert cluster_service.dbscan([(BASE[0] + a, BASE[1] + b) for a, b in far]) == []


def test_buffer_is_about_100_meters():
    single_point_hull = cluster_service.build_cluster_polygon([BASE, BASE, BASE])
    minx, miny, maxx, maxy = single_point_hull.bounds
    height_m = (maxy - miny) * 111_195
    assert 195 < height_m < 205


# --- Semilla (07 TASK-INT-01) ---
def test_seed_data_is_inside_formosa_and_forms_two_zones():
    from scripts.seed_data import build_seed_reports

    geo_service.init_territory(settings.territory_path)
    seed = build_seed_reports()
    assert len(seed) == 30
    assert all(geo_service.is_within_territory(r.latitude, r.longitude) for r in seed)
    reports = [{"category": r.category, "latitude": r.latitude, "longitude": r.longitude,
                "created_at": NOW - timedelta(hours=1), "current_status": r.final_status} for r in seed]
    categories = sorted(c.category for c in cluster_service.compute_clusters(reports, NOW))
    assert categories == ["calle_anegada", "desborde_rio_riacho"]


# --- Transversales ---
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    # 03 §2.1.7 (versión NEXO MAP)
    assert response.json() == {"status": "ok", "service": "nexo-map-api"}


def test_unknown_route_uses_error_format(client):
    response = client.get("/api/v1/no-existe")
    assert response.status_code == 404
    assert set(response.json()["error"]) == {"code", "message", "details", "timestamp"}


def test_method_not_allowed_uses_error_format(client):
    response = client.delete("/api/v1/incidents")
    assert response.status_code == 405
    assert set(response.json()["error"]) == {"code", "message", "details", "timestamp"}


@pytest.mark.parametrize("origin", ["http://localhost:5173", "exp://192.168.1.50:8081"])
def test_cors_allows_configured_origins(client, origin):
    response = client.options("/api/v1/incidents", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_unknown_origin(client):
    response = client.options("/api/v1/incidents", headers={"Origin": "https://malicioso.example",
                                                            "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in response.headers


def test_global_rate_limit_by_ip(client, monkeypatch):
    from core.security import limiter

    limiter.reset()
    limit = settings.rate_limit_per_minute
    for _ in range(limit):
        client.get("/health")
    assert_error(client.get("/health"), 429, "RATE_LIMIT_EXCEEDED")


def test_global_rate_limit_applies_to_api_routes(client, monkeypatch):
    """Regresión: el límite global no regía para /api/v1/* (rutas dentro de _IncludedRouter)."""
    from core.security import limiter

    limiter.reset()
    monkeypatch.setattr(settings, "rate_limit_per_minute", 3)
    for _ in range(3):
        assert client.get("/api/v1/incidents").status_code == 200
    assert_error(client.get("/api/v1/incidents/clusters"), 429, "RATE_LIMIT_EXCEEDED")


def test_openapi_lists_exactly_the_contract_routes(client):
    paths = client.get("/openapi.json").json()["paths"]
    routes = {(m.upper(), p) for p, ops in paths.items() for m in ops}
    assert routes == {
        ("GET", "/health"),
        ("POST", "/api/v1/auth/register"),
        ("POST", "/api/v1/auth/login"),
        ("POST", "/api/v1/auth/refresh"),
        ("GET", "/api/v1/incidents"),
        ("GET", "/api/v1/incidents/clusters"),
        ("GET", "/api/v1/incidents/{incident_id}"),
        ("POST", "/api/v1/reports"),
        ("GET", "/api/v1/reports/me"),
        ("GET", "/api/v1/reports/me/{report_id}"),
        ("GET", "/api/v1/admin/dashboard/stats"),
        ("GET", "/api/v1/admin/reports"),
        ("PATCH", "/api/v1/admin/reports/{report_id}/status"),
        ("GET", "/api/v1/admin/reports/{report_id}/history"),
        # Ampliación documentada de 02 §5 (03 §4.6): preferencia de notificaciones push.
        ("PUT", "/api/v1/users/me/notifications"),
        # Herramienta de pruebas (03 §4.7), deshabilitada salvo ENABLE_DATA_RESET=true.
        ("POST", "/api/v1/admin/maintenance/reset"),
    }


def test_rejected_requests_do_not_open_database(monkeypatch):
    """400/401/403 se resuelven sin conexión a PostgreSQL (el pool es perezoso)."""
    import database
    from fastapi.testclient import TestClient

    from main import app

    async def forbidden_pool():
        raise AssertionError("no debería conectarse a la base de datos")

    monkeypatch.setattr(database, "get_db_pool", forbidden_pool)
    with TestClient(app) as c:
        assert_error(c.get("/api/v1/incidents?bbox=1,2"), 400, "INVALID_INPUT")
        assert_error(c.get("/api/v1/incidents/abc"), 400, "INVALID_INPUT")
        assert_error(c.get("/api/v1/reports/me"), 401, "AUTH_REQUIRED")
        assert_error(c.get("/api/v1/admin/dashboard/stats", headers={"Authorization": "Bearer x.y.z"}),
                     401, "AUTH_REQUIRED")


def test_openapi_report_form_fields(client):
    spec = client.get("/openapi.json").json()
    body = spec["paths"]["/api/v1/reports"]["post"]["requestBody"]["content"]
    assert "multipart/form-data" in body
    ref = body["multipart/form-data"]["schema"]["$ref"].split("/")[-1]
    props = spec["components"]["schemas"][ref]["properties"]
    assert set(props) == {"category", "latitude", "longitude", "comment", "photo"}
