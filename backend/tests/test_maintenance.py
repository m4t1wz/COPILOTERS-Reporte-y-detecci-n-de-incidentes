"""Borrado de datos para pruebas (03 §4.7)."""
import pytest

from core.config import settings
from main import app
from services.maintenance_service import _photo_path, get_maintenance_service
from tests.conftest import assert_error, auth_header

URL = "/api/v1/admin/maintenance/reset"


class FakeMaintenance:
    def __init__(self):
        self.calls = []

    async def reset(self, scope, keep_user_id):
        self.calls.append((scope, keep_user_id))
        return {"reportes": 2, "historial": 4, "agrupaciones": 1, "fotos": 1, "cuentas": 3}


@pytest.fixture
def fake(client):
    service = FakeMaintenance()
    app.dependency_overrides[get_maintenance_service] = lambda: service
    return service


def test_disabled_by_default_looks_like_missing_route(client, fake, monkeypatch):
    monkeypatch.setattr(settings, "enable_data_reset", False)
    response = client.post(URL, json={"scope": "todo", "confirmation": "BORRAR"})
    assert response.status_code == 404
    assert fake.calls == []


def test_requires_admin(client, ctx, fake, monkeypatch):
    monkeypatch.setattr(settings, "enable_data_reset", True)
    assert_error(client.post(URL, json={"scope": "todo", "confirmation": "BORRAR"}), 401, "AUTH_REQUIRED")
    assert_error(client.post(URL, json={"scope": "todo", "confirmation": "BORRAR"},
                             headers=auth_header(ctx.citizen["id"])), 403, "FORBIDDEN_RESOURCE")
    assert fake.calls == []


def test_requires_confirmation_word(client, ctx, fake, monkeypatch):
    monkeypatch.setattr(settings, "enable_data_reset", True)
    response = client.post(URL, json={"scope": "reportes", "confirmation": "borrar todo"},
                           headers=auth_header(ctx.admin["id"]))
    assert_error(response, 422, "VALIDATION_ERROR")
    assert_error(client.post(URL, json={"scope": "nada", "confirmation": "BORRAR"},
                             headers=auth_header(ctx.admin["id"])), 400, "INVALID_INPUT")
    assert fake.calls == []


@pytest.mark.parametrize("scope", ["agrupaciones", "reportes", "cuentas", "todo"])
def test_admin_resets_keeping_own_account(client, ctx, fake, monkeypatch, scope):
    monkeypatch.setattr(settings, "enable_data_reset", True)
    response = client.post(URL, json={"scope": scope, "confirmation": "BORRAR"}, headers=auth_header(ctx.admin["id"]))
    assert response.status_code == 200
    assert response.json() == {"scope": scope, "deleted": {"reportes": 2, "historial": 4, "agrupaciones": 1,
                                                           "fotos": 1, "cuentas": 3}}
    assert fake.calls == [(scope, ctx.admin["id"])]


def test_photo_path_from_public_url():
    url = "https://x.supabase.co/storage/v1/object/public/incident-photos/reports/2026/11/abc_1.webp"
    assert _photo_path(url) == "reports/2026/11/abc_1.webp"
    assert _photo_path(None) is None
    assert _photo_path("https://otro.com/foto.jpg") is None
