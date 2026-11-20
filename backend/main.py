"""Punto de entrada de la API FastAPI (docs/03. backend.md §2.1)."""
import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from api.v1.api import api_router
from core.config import settings
from core.handlers import register_exception_handlers
from core.security import limiter
from database import close_db_pool
from services.geocoding_service import get_geocoding_service
from services import geo_service

logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    geo_service.init_territory(settings.territory_path)
    yield
    await get_geocoding_service().aclose()
    await close_db_pool()


app = FastAPI(
    title="NEXO MAP API",
    version="1.0.0",
    description="NEXO MAP — Sistema de reporte y seguimiento de incidentes territoriales (Formosa).",
    lifespan=lifespan,
)


def _cors_options(origins: list[str]) -> dict:
    # DOC-PENDIENTE: ALLOWED_ORIGINS incluye "exp://*"; CORSMiddleware no admite comodines dentro de
    # allow_origins, por lo que esos valores se convierten en allow_origin_regex.
    exact = [o for o in origins if "*" not in o]
    patterns = [re.escape(o).replace(r"\*", ".*") for o in origins if "*" in o]
    options: dict = {"allow_origins": exact}
    if patterns:
        options["allow_origin_regex"] = "^(" + "|".join(patterns) + ")$"
    return options


app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Se agrega después para que sea la capa externa (las respuestas 429 también llevan cabeceras CORS).
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    **_cors_options(settings.allowed_origins_list),
)

register_exception_handlers(app)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "service": "nexo-map-api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
