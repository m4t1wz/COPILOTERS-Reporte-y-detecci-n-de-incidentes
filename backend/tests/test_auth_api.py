"""Autenticación y RBAC (docs/02. system-contracts.md §3; docs/03. backend.md §3; 07 TASK-BE-03)."""
from uuid import UUID, uuid4

import pytest

from tests.conftest import JWT_SECRET, assert_error, auth_header, make_token

REGISTER_BODY = {
    "email": "ciudadano.formosa@gmail.com",
    "password": "PasswordSeguro123!",
    "full_name": "Juan Pérez",
    "phone_number": "+543704123456",
}


def _assert_auth_response(body, *, email, full_name, phone, role):
    assert set(body) == {"user", "session"}
    assert set(body["user"]) == {"id", "email", "full_name", "phone_number", "role"}
    UUID(body["user"]["id"])
    assert body["user"]["email"] == email
    assert body["user"]["full_name"] == full_name
    assert body["user"]["phone_number"] == phone
    assert body["user"]["role"] == role
    assert set(body["session"]) == {"access_token", "refresh_token", "token_type", "expires_in"}
    assert body["session"]["token_type"] == "bearer"
    assert body["session"]["expires_in"] == 3600


def test_register_returns_201_with_user_and_session(client, ctx):
    response = client.post("/api/v1/auth/register", json=REGISTER_BODY)
    assert response.status_code == 201, response.text
    _assert_auth_response(response.json(), email=REGISTER_BODY["email"], full_name="Juan Pérez",
                          phone="+543704123456", role="citizen")


def test_register_never_sends_role_to_supabase(client, ctx):
    client.post("/api/v1/auth/register", json={**REGISTER_BODY, "role": "admin"})
    data = ctx.auth.last_sign_up_payload["options"]["data"]
    assert "role" not in data
    assert data == {"full_name": "Juan Pérez", "phone_number": "+543704123456"}


def test_register_duplicate_email(client, ctx):
    assert client.post("/api/v1/auth/register", json=REGISTER_BODY).status_code == 201
    assert_error(client.post("/api/v1/auth/register", json=REGISTER_BODY), 400, "INVALID_INPUT")


@pytest.mark.parametrize("missing", ["email", "password", "full_name"])
def test_register_missing_fields(client, missing):
    body = {k: v for k, v in REGISTER_BODY.items() if k != missing}
    assert_error(client.post("/api/v1/auth/register", json=body), 400, "INVALID_INPUT")


def test_register_invalid_json(client):
    response = client.post("/api/v1/auth/register", content="{no-json", headers={"Content-Type": "application/json"})
    assert_error(response, 400, "INVALID_INPUT")


def test_login_returns_profile_with_role(client, ctx):
    client.post("/api/v1/auth/register", json=REGISTER_BODY)
    response = client.post("/api/v1/auth/login", json={"email": REGISTER_BODY["email"],
                                                       "password": REGISTER_BODY["password"]})
    assert response.status_code == 200, response.text
    _assert_auth_response(response.json(), email=REGISTER_BODY["email"], full_name="Juan Pérez",
                          phone="+543704123456", role="citizen")


def test_login_admin_role(client, ctx):
    profile = ctx.repo.add_profile(role="admin", full_name="Ing. María González", email="operador@formosa.gob.ar",
                                   phone="+543704987654")
    ctx.auth.passwords["operador@formosa.gob.ar"] = ("AdminClaveRobusta2026!", profile["id"])
    response = client.post("/api/v1/auth/login", json={"email": "operador@formosa.gob.ar",
                                                       "password": "AdminClaveRobusta2026!"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_login_invalid_credentials_returns_401(client, ctx):
    client.post("/api/v1/auth/register", json=REGISTER_BODY)
    response = client.post("/api/v1/auth/login", json={"email": REGISTER_BODY["email"], "password": "incorrecta"})
    assert_error(response, 401, "AUTH_REQUIRED")


def test_login_token_is_usable(client, ctx):
    client.post("/api/v1/auth/register", json=REGISTER_BODY)
    token = client.post("/api/v1/auth/login", json={"email": REGISTER_BODY["email"],
                                                    "password": REGISTER_BODY["password"]}).json()["session"]["access_token"]
    assert client.get("/api/v1/reports/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_refresh_returns_new_tokens(client, ctx):
    session = client.post("/api/v1/auth/register", json=REGISTER_BODY).json()["session"]
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"access_token", "refresh_token", "token_type", "expires_in"}
    assert body["token_type"] == "bearer"
    assert body["refresh_token"] != session["refresh_token"]


def test_refresh_invalid_token_returns_401(client):
    assert_error(client.post("/api/v1/auth/refresh", json={"refresh_token": "no-existe"}), 401, "AUTH_REQUIRED")


# --- Dependencias JWT / RBAC ---
def test_missing_token_returns_auth_required(client):
    assert_error(client.get("/api/v1/admin/dashboard/stats"), 401, "AUTH_REQUIRED")


def test_expired_token_returns_token_expired(client, ctx):
    response = client.get("/api/v1/reports/me", headers=auth_header(ctx.citizen["id"], expires_in=-60))
    assert_error(response, 401, "TOKEN_EXPIRED")


@pytest.mark.parametrize("token_kwargs", [{"secret": "otro-secreto-que-no-es-el-del-proyecto-1234"},
                                          {"audience": "anon"}])
def test_invalid_token_returns_auth_required(client, ctx, token_kwargs):
    response = client.get("/api/v1/reports/me", headers=auth_header(ctx.citizen["id"], **token_kwargs))
    assert_error(response, 401, "AUTH_REQUIRED")


def test_malformed_token_returns_auth_required(client):
    assert_error(client.get("/api/v1/reports/me", headers={"Authorization": "Bearer abc.def"}), 401, "AUTH_REQUIRED")


def test_token_of_unregistered_user_returns_auth_required(client):
    assert_error(client.get("/api/v1/reports/me", headers=auth_header(uuid4())), 401, "AUTH_REQUIRED")


@pytest.mark.parametrize("method,path", [
    ("get", "/api/v1/admin/dashboard/stats"),
    ("get", "/api/v1/admin/reports"),
    ("patch", f"/api/v1/admin/reports/{uuid4()}/status"),
    ("get", f"/api/v1/admin/reports/{uuid4()}/history"),
])
def test_citizen_cannot_access_admin_routes(client, ctx, method, path):
    kwargs = {"json": {"new_status": "en_revision", "admin_comment": "Comentario"}} if method == "patch" else {}
    response = getattr(client, method)(path, headers=auth_header(ctx.citizen["id"]), **kwargs)
    assert_error(response, 403, "FORBIDDEN_RESOURCE")


def test_jwt_secret_is_read_from_settings():
    from core.config import settings

    assert settings.supabase_jwt_secret == JWT_SECRET
    assert make_token(uuid4())
