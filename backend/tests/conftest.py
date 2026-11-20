"""Fixtures de prueba.

Sin credenciales de Supabase ni PostgreSQL local, la base de datos, Supabase Auth, Storage y Nominatim se
reemplazan con dobles en memoria vía `app.dependency_overrides`. El diseño del backend no cambia: los
dobles implementan la misma interfaz que `ReportRepository` / `ClusterRepository` y replican la semántica
de sus consultas SQL. La verificación JWT, la FSM, la validación territorial, el procesamiento de imágenes,
el clustering y los formatos de respuesta se ejercitan con el código real.
"""
import os

os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret-for-pytest-only-0123456789"
os.environ["SUPABASE_URL"] = "https://test-project.supabase.co"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:5173,exp://*"
os.environ["RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["REPORT_SUBMIT_RATE_LIMIT_PER_MINUTE"] = "5"

import io  # noqa: E402
import json  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402
from types import SimpleNamespace  # noqa: E402
from uuid import UUID, uuid4  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from jose import jwt  # noqa: E402
from PIL import Image  # noqa: E402
from shapely.geometry import mapping  # noqa: E402
from supabase_auth.errors import AuthApiError  # noqa: E402

from api.v1.endpoints.auth import get_auth_client  # noqa: E402
from core.security import limiter  # noqa: E402
from main import app  # noqa: E402
from services.cluster_service import get_cluster_repository  # noqa: E402
from services.geocoding_service import get_geocoding_service  # noqa: E402
from services.report_service import get_report_repository  # noqa: E402
from services.push_service import PushResult, get_push_service  # noqa: E402
from services.storage_service import StorageService, get_storage_service  # noqa: E402

JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
FIXED_ADDRESS = "Av. 25 de Mayo y Calle Fontana, Formosa Capital"
INSIDE = (-26.1852, -58.1738)  # (lat, lon) Formosa Capital — 07 TASK-BE-02
ASUNCION = (-25.2637, -57.5759)
RESISTENCIA = (-27.4606, -58.9839)


class Clock:
    """Reloj monotónico para que created_at sea determinista y creciente."""

    def __init__(self):
        self.current = datetime.now(timezone.utc) - timedelta(hours=1)

    def now(self) -> datetime:
        self.current += timedelta(seconds=1)
        return self.current


class FakeReportRepository:
    def __init__(self, clock: Clock):
        self.clock = clock
        self.profiles: dict[UUID, dict] = {}
        self.reports: dict[UUID, dict] = {}
        self.history: list[dict] = []
        self._next_number = 1
        self.fail_on_create = False
        self.notifications: dict[UUID, dict] = {}

    def add_profile(self, *, role="citizen", full_name="Juan Pérez", email=None, phone="+543704123456") -> dict:
        uid = uuid4()
        profile = {"id": uid, "email": email or f"{uid}@example.com", "full_name": full_name,
                   "phone_number": phone, "role": role}
        self.profiles[uid] = profile
        return profile

    async def get_profile(self, user_id):
        return self.profiles.get(user_id)

    async def create_report(self, *, report_id, citizen_id, category, comment, photo_url, latitude, longitude,
                            address_reference):
        if self.fail_on_create:
            raise RuntimeError("fallo simulado de base de datos")
        now = self.clock.now()
        row = {"id": report_id, "report_number": self._next_number, "citizen_id": citizen_id, "category": category,
               "comment": comment, "photo_url": photo_url, "latitude": latitude, "longitude": longitude,
               "address_reference": address_reference, "current_status": "pendiente",
               "created_at": now, "updated_at": now}
        self._next_number += 1
        self.reports[report_id] = row
        self.history.append({"id": uuid4(), "report_id": report_id, "previous_status": None,
                             "new_status": "pendiente", "changed_by": citizen_id, "admin_comment": None,
                             "created_at": now})
        return dict(row)

    async def get_report(self, report_id):
        row = self.reports.get(report_id)
        return dict(row) if row else None

    async def list_incidents(self, filters):
        rows = [r for r in self.reports.values() if r["current_status"] in filters.statuses]
        if filters.category:
            rows = [r for r in rows if r["category"] == filters.category]
        if filters.bbox:
            min_lon, min_lat, max_lon, max_lat = filters.bbox
            rows = [r for r in rows if min_lon <= r["longitude"] <= max_lon and min_lat <= r["latitude"] <= max_lat]
        if filters.start_date:
            rows = [r for r in rows if r["created_at"] >= filters.start_date]
        if filters.end_date:
            rows = [r for r in rows if r["created_at"] <= filters.end_date]
        return [dict(r) for r in sorted(rows, key=lambda r: r["created_at"], reverse=True)]

    async def list_citizen_reports(self, citizen_id, page, page_size):
        rows = sorted((r for r in self.reports.values() if r["citizen_id"] == citizen_id),
                      key=lambda r: r["created_at"], reverse=True)
        start = (page - 1) * page_size
        return [dict(r) for r in rows[start:start + page_size]], len(rows)

    async def list_admin_reports(self, filters, page, page_size):
        rows = list(self.reports.values())
        if filters.status:
            rows = [r for r in rows if r["current_status"] == filters.status]
        if filters.category:
            rows = [r for r in rows if r["category"] == filters.category]
        if filters.start_date:
            rows = [r for r in rows if r["created_at"] >= filters.start_date]
        if filters.end_date:
            rows = [r for r in rows if r["created_at"] <= filters.end_date]
        if filters.search:
            term = filters.search.lower()
            rows = [r for r in rows if term in (r["comment"] or "").lower() or term in r["address_reference"].lower()]
        rows.sort(key=lambda r: r["created_at"], reverse=True)
        start = (page - 1) * page_size
        out = []
        for r in rows[start:start + page_size]:
            p = self.profiles[r["citizen_id"]]
            out.append({**r, "citizen_full_name": p["full_name"], "citizen_phone_number": p["phone_number"]})
        return out, len(rows)

    async def count_by_status(self):
        counts: dict[str, int] = {}
        for r in self.reports.values():
            counts[r["current_status"]] = counts.get(r["current_status"], 0) + 1
        return counts

    async def get_history(self, report_id):
        rows = sorted((h for h in self.history if h["report_id"] == report_id), key=lambda h: h["created_at"])
        out = []
        for h in rows:
            p = self.profiles[h["changed_by"]]
            out.append({**h, "changed_by_role": p["role"], "changed_by_name": p["full_name"]})
        return out

    async def change_status(self, *, report_id, expected_status, new_status, changed_by, admin_comment):
        row = self.reports.get(report_id)
        if row is None or row["current_status"] != expected_status:
            return None
        now = self.clock.now()
        row["current_status"] = new_status
        row["updated_at"] = now
        self.history.append({"id": uuid4(), "report_id": report_id, "previous_status": expected_status,
                             "new_status": new_status, "changed_by": changed_by, "admin_comment": admin_comment,
                             "created_at": now})
        return dict(row)

    # Notificaciones push (DEP-00)
    async def set_notification_settings(self, user_id, enabled, push_token):
        token = push_token if enabled else None
        if token:
            for uid, conf in self.notifications.items():
                if uid != user_id and conf["push_token"] == token:
                    conf["push_token"] = None
        self.notifications[user_id] = {"enabled": enabled, "push_token": token}
        return dict(self.notifications[user_id])

    async def get_notification_target(self, user_id):
        conf = self.notifications.get(user_id)
        return dict(conf) if conf else None

    async def clear_push_token(self, push_token):
        for conf in self.notifications.values():
            if conf["push_token"] == push_token:
                conf["push_token"] = None


class FakePushService:
    """Registra los mensajes en lugar de llamar a la Expo Push API."""

    def __init__(self):
        self.sent: list[dict] = []
        self.next_result = PushResult(sent=True)

    async def send(self, message):
        self.sent.append(message)
        return self.next_result


class FakeClusterRepository:
    def __init__(self, reports: FakeReportRepository):
        self.reports = reports
        self.clusters: list[dict] = []
        self.recalculations = 0

    async def fetch_candidate_reports(self, since):
        return [dict(r) for r in self.reports.reports.values()
                if r["current_status"] in ("verificado", "en_seguimiento") and r["created_at"] >= since]

    async def replace_active_clusters(self, clusters):
        self.recalculations += 1
        for c in self.clusters:
            c["is_active"] = False
        for c in clusters:
            self.clusters.append({"id": uuid4(), "category": c.category, "incident_count": c.incident_count,
                                  "geometry": json.loads(json.dumps(mapping(c.polygon))),
                                  "window_start": c.window_start, "window_end": c.window_end, "is_active": True})

    async def list_active_clusters(self):
        return [dict(c) for c in self.clusters if c["is_active"]]

    async def count_active_clusters(self):
        return sum(1 for c in self.clusters if c["is_active"])


class FakeGeocoder:
    def __init__(self):
        self.calls = 0

    async def reverse_geocode(self, latitude, longitude):
        self.calls += 1
        return FIXED_ADDRESS


class FakeBucket:
    def __init__(self, store):
        self.store = store

    def upload(self, path, content, options):
        self.store.uploaded[path] = (content, options)

    def get_public_url(self, path):
        return f"https://test-project.supabase.co/storage/v1/object/public/incident-photos/{path}"

    def remove(self, paths):
        for p in paths:
            self.store.uploaded.pop(p, None)
            self.store.removed.append(p)


class FakeStorageClient:
    def __init__(self):
        self.uploaded: dict[str, tuple] = {}
        self.removed: list[str] = []
        self.buckets: list[str] = []
        self.storage = SimpleNamespace(from_=self._from)

    def _from(self, bucket):
        self.buckets.append(bucket)
        return FakeBucket(self)


class FakeAuth:
    """Imita supabase.auth (sign_up, sign_in_with_password, refresh_session)."""

    def __init__(self, repo: FakeReportRepository):
        self.repo = repo
        self.passwords: dict[str, tuple[str, UUID]] = {}
        self.refresh_tokens: dict[str, UUID] = {}
        self.last_sign_up_payload = None

    def _session(self, uid):
        refresh = str(uuid4())
        self.refresh_tokens[refresh] = uid
        return SimpleNamespace(access_token=make_token(uid), refresh_token=refresh, token_type="bearer",
                               expires_in=3600)

    def sign_up(self, payload):
        self.last_sign_up_payload = payload
        email = payload["email"]
        if email in self.passwords:
            raise AuthApiError("User already registered", 422, "user_already_exists")
        data = payload.get("options", {}).get("data", {})
        # Replica el trigger handle_new_user (06 §3.2).
        profile = self.repo.add_profile(role=data.get("role", "citizen"), full_name=data.get("full_name", "Ciudadano"),
                                        email=email, phone=data.get("phone_number"))
        self.passwords[email] = (payload["password"], profile["id"])
        return SimpleNamespace(user=SimpleNamespace(id=str(profile["id"])), session=self._session(profile["id"]))

    def sign_in_with_password(self, payload):
        stored = self.passwords.get(payload["email"])
        if stored is None or stored[0] != payload["password"]:
            raise AuthApiError("Invalid login credentials", 400, "invalid_credentials")
        return SimpleNamespace(user=SimpleNamespace(id=str(stored[1])), session=self._session(stored[1]))

    def refresh_session(self, refresh_token):
        uid = self.refresh_tokens.pop(refresh_token, None)
        if uid is None:
            raise AuthApiError("Invalid Refresh Token", 400, "refresh_token_not_found")
        return SimpleNamespace(user=SimpleNamespace(id=str(uid)), session=self._session(uid))


def make_token(user_id, *, expires_in: int = 3600, secret: str = JWT_SECRET, audience: str = "authenticated") -> str:
    now = datetime.now(timezone.utc)
    claims = {"sub": str(user_id), "aud": audience, "role": "authenticated",
              "iat": int(now.timestamp()), "exp": int((now + timedelta(seconds=expires_in)).timestamp())}
    return jwt.encode(claims, secret, algorithm="HS256")


def auth_header(user_id, **kwargs) -> dict:
    return {"Authorization": f"Bearer {make_token(user_id, **kwargs)}"}


def make_image(fmt="JPEG", size=(800, 600), color=(30, 120, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture
def ctx():
    clock = Clock()
    repo = FakeReportRepository(clock)
    clusters = FakeClusterRepository(repo)
    storage_client = FakeStorageClient()
    ns = SimpleNamespace(
        clock=clock,
        repo=repo,
        clusters=clusters,
        storage_client=storage_client,
        geocoder=FakeGeocoder(),
        auth=FakeAuth(repo),
        push=FakePushService(),
    )
    ns.citizen = repo.add_profile(role="citizen", full_name="Juan Pérez")
    ns.other_citizen = repo.add_profile(role="citizen", full_name="Ana Gómez")
    ns.admin = repo.add_profile(role="admin", full_name="Ing. María González", phone="+543704987654")
    return ns


@pytest.fixture
def client(ctx):
    async def _repo():
        return ctx.repo

    async def _clusters():
        return ctx.clusters

    app.dependency_overrides[get_report_repository] = _repo
    app.dependency_overrides[get_cluster_repository] = _clusters
    app.dependency_overrides[get_geocoding_service] = lambda: ctx.geocoder
    app.dependency_overrides[get_storage_service] = lambda: StorageService(lambda: ctx.storage_client)
    app.dependency_overrides[get_auth_client] = lambda: SimpleNamespace(auth=ctx.auth)
    app.dependency_overrides[get_push_service] = lambda: ctx.push
    limiter.reset()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    limiter.reset()


def post_report(client, user_id, *, category="calle_anegada", lat=INSIDE[0], lon=INSIDE[1],
                comment="El agua supera la vereda e ingresa a los domicilios.", photo: bytes | None = None,
                photo_name="foto.jpg", headers=None):
    data = {"category": category, "latitude": str(lat), "longitude": str(lon)}
    if comment is not None:
        data["comment"] = comment
    files = {"photo": (photo_name, photo, "image/jpeg")} if photo is not None else None
    return client.post("/api/v1/reports", data=data, files=files,
                       headers=headers if headers is not None else auth_header(user_id))


def assert_error(response, status_code: int, code: str):
    assert response.status_code == status_code, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "details", "timestamp"}
    assert body["error"]["code"] == code
    assert body["error"]["timestamp"].endswith("Z")
    return body["error"]
