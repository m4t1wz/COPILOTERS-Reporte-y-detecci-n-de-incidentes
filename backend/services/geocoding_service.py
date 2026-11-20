"""Geodecodificación inversa con Nominatim y caché LRU (docs/03. backend.md §4.2)."""
import asyncio
import logging

import httpx
from cachetools import LRUCache

logger = logging.getLogger(__name__)

# La política de uso de Nominatim pide identificar la aplicación con un contacto: NOMINATIM_USER_AGENT (.env).
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "nexo-map-api"
# 03 §4.2: 1,5 s de espera de respuesta. La conexión TCP+TLS con Nominatim (Europa) puede tardar más desde
# Argentina, así que se separa del límite de respuesta y se reutiliza con un cliente persistente (INT-07, D12).
TIMEOUT_SECONDS = 1.5
CONNECT_TIMEOUT_SECONDS = 3.0
CACHE_DECIMALS = 4
CACHE_SIZE = 4096


def fallback_reference(latitude: float, longitude: float) -> str:
    """Referencia de contingencia: "Ubicación Formosa (-26.1852, -58.1738)"."""
    return f"Ubicación Formosa ({latitude:.4f}, {longitude:.4f})"


def format_address(payload: dict) -> str | None:
    # DOC-PENDIENTE: el formato exacto de la dirección no está definido; se usa calle (+ número) y
    # localidad; si faltan, display_name.
    address = payload.get("address") or {}
    road = address.get("road") or address.get("pedestrian") or address.get("path")
    if road and address.get("house_number"):
        road = f"{road} {address['house_number']}"
    locality = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("municipality")
        or address.get("county")
    )
    parts = [p for p in (road, locality) if p]
    if parts:
        return ", ".join(parts)
    return payload.get("display_name") or None


class GeocodingService:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None, user_agent: str = USER_AGENT):
        self._cache: LRUCache = LRUCache(maxsize=CACHE_SIZE)
        self._transport = transport
        self._user_agent = user_agent
        self._client: httpx.AsyncClient | None = None
        self._client_loop: asyncio.AbstractEventLoop | None = None

    def _get_client(self) -> httpx.AsyncClient:
        # El cliente queda ligado al event loop que lo creó; se recrea si cambia (p. ej. entre tests).
        loop = asyncio.get_running_loop()
        if self._client is None or self._client.is_closed or self._client_loop is not loop:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS),
                transport=self._transport,
                headers={"User-Agent": self._user_agent},
            )
            self._client_loop = loop
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
        self._client = None

    async def reverse_geocode(self, latitude: float, longitude: float) -> str:
        key = (round(latitude, CACHE_DECIMALS), round(longitude, CACHE_DECIMALS))
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        try:
            response = await asyncio.wait_for(
                self._get_client().get(
                    NOMINATIM_URL,
                    params={
                        "format": "jsonv2",
                        "lat": latitude,
                        "lon": longitude,
                        "addressdetails": 1,
                        "accept-language": "es",
                    },
                ),
                timeout=CONNECT_TIMEOUT_SECONDS + TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            reference = format_address(response.json())
        except (httpx.HTTPError, asyncio.TimeoutError, ValueError) as exc:
            logger.warning("Geodecodificación inversa no disponible: %s", exc)
            return fallback_reference(latitude, longitude)
        if not reference:
            return fallback_reference(latitude, longitude)
        self._cache[key] = reference
        return reference


def _configured_user_agent() -> str:
    from core.config import settings

    return settings.nominatim_user_agent or USER_AGENT


_geocoding_service = GeocodingService(user_agent=_configured_user_agent())


def get_geocoding_service() -> GeocodingService:
    return _geocoding_service
