"""Conector central de persistencia con Supabase (docs/03. backend.md §2.2).

- Cliente oficial supabase-py con SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (DB y Storage).
- Pool asyncpg hacia PostgreSQL para consultas espaciales nativas de PostGIS.
- Reconexión y timeouts centralizados.
"""
import asyncio
import logging

import asyncpg
from supabase import Client, ClientOptions, create_client

from core.config import settings

logger = logging.getLogger(__name__)

NETWORK_TIMEOUT_SECONDS = 10
CONNECT_RETRIES = 3

_supabase_client: Client | None = None
_db_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()


def _client_options() -> ClientOptions:
    return ClientOptions(
        postgrest_client_timeout=NETWORK_TIMEOUT_SECONDS,
        storage_client_timeout=NETWORK_TIMEOUT_SECONDS,
        auto_refresh_token=False,
        persist_session=False,
    )


def get_supabase_client() -> Client:
    """Cliente singleton con clave service_role (operaciones de base de datos y Storage)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key, options=_client_options()
        )
    return _supabase_client


def create_auth_client() -> Client:
    """Cliente con anon_key para operaciones de Supabase Auth (registro, login, refresh).

    Se crea uno por operación porque supabase-py guarda la sesión iniciada dentro del cliente;
    hacerlo sobre el singleton service_role reemplazaría sus credenciales.
    """
    return create_client(settings.supabase_url, settings.supabase_anon_key, options=_client_options())


async def get_db_pool() -> asyncpg.Pool:
    """Pool asyncpg perezoso con reintentos de conexión."""
    global _db_pool
    if _db_pool is not None:
        return _db_pool
    async with _pool_lock:
        if _db_pool is not None:
            return _db_pool
        last_error: Exception | None = None
        for attempt in range(1, CONNECT_RETRIES + 1):
            try:
                _db_pool = await asyncpg.create_pool(
                    dsn=settings.database_url,
                    min_size=1,
                    max_size=10,
                    timeout=NETWORK_TIMEOUT_SECONDS,
                    command_timeout=NETWORK_TIMEOUT_SECONDS,
                    # El pooler de Supabase (PgBouncer en modo transacción) no admite sentencias preparadas.
                    statement_cache_size=0,
                )
                return _db_pool
            except (OSError, asyncpg.PostgresError, asyncio.TimeoutError) as exc:
                last_error = exc
                logger.warning("Conexión a PostgreSQL fallida (intento %s/%s): %s", attempt, CONNECT_RETRIES, exc)
                await asyncio.sleep(0.5 * attempt)
        raise ConnectionError("No se pudo conectar a PostgreSQL") from last_error


async def close_db_pool() -> None:
    global _db_pool
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None
