"""Servidor HTTP real (uvicorn) con datos SIMULADOS en memoria, para probar la API sin Supabase.

Usa la misma aplicación `main.app` y reemplaza solo la base de datos, Supabase Auth, Storage y
Nominatim por los dobles de `tests/conftest.py`. Los datos se pierden al detener el servidor.
No usar en producción.

Uso (desde backend/):
    .venv\\Scripts\\python -m tests.simulated_server [puerto]

Crea un administrador de prueba: admin@formosa.gob.ar / AdminDePrueba123!
"""
import sys
from types import SimpleNamespace

import uvicorn

from tests import conftest  # configura variables de entorno de prueba antes de importar la app
from api.v1.endpoints.auth import get_auth_client
from main import app
from services.cluster_service import get_cluster_repository
from services.geocoding_service import get_geocoding_service
from services.report_service import get_report_repository
from services.storage_service import StorageService, get_storage_service

ADMIN_EMAIL = "admin@formosa.gob.ar"
ADMIN_PASSWORD = "AdminDePrueba123!"


def install_fakes() -> None:
    clock = conftest.Clock()
    repo = conftest.FakeReportRepository(clock)
    clusters = conftest.FakeClusterRepository(repo)
    storage_client = conftest.FakeStorageClient()
    auth = conftest.FakeAuth(repo)
    geocoder = conftest.FakeGeocoder()

    admin = repo.add_profile(role="admin", full_name="Administrador de Prueba", email=ADMIN_EMAIL,
                             phone="+543704000000")
    auth.passwords[ADMIN_EMAIL] = (ADMIN_PASSWORD, admin["id"])

    async def _repo():
        return repo

    async def _clusters():
        return clusters

    app.dependency_overrides[get_report_repository] = _repo
    app.dependency_overrides[get_cluster_repository] = _clusters
    app.dependency_overrides[get_geocoding_service] = lambda: geocoder
    app.dependency_overrides[get_storage_service] = lambda: StorageService(lambda: storage_client)
    app.dependency_overrides[get_auth_client] = lambda: SimpleNamespace(auth=auth)


if __name__ == "__main__":
    install_fakes()
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    print(f"Servidor SIMULADO en http://127.0.0.1:{port} (admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD})")
    uvicorn.run(app, host="127.0.0.1", port=port)
