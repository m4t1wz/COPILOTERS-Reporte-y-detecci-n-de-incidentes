"""Configuración del backend con Pydantic Settings (docs/03. backend.md §6)."""
from functools import cached_property
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Configuración del Entorno
    environment: str = "development"
    debug: bool = False
    port: int = 8000
    host: str = "0.0.0.0"

    # CORS
    allowed_origins: str = ""

    # Supabase Platform
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Supabase PostgreSQL Conexión Directa (para PostGIS)
    database_url: str = ""

    # Recursos Cartográficos y Territoriales
    # El polígono vive en backend/data/ (antes en la carpeta raíz Fsa_geojson/, que se eliminó).
    geojson_territory_path: str = "data/formosa.json"

    # Geocodificación inversa: la política de uso de Nominatim pide identificar la aplicación con un contacto.
    # El contacto real se configura solo en el entorno (.env / hosting), nunca en el código.
    nominatim_user_agent: str = "nexo-map-api"

    # Herramienta de borrado de datos para pruebas (03 §4.7). Apagada por defecto.
    enable_data_reset: bool = False

    # Rate Limiting
    rate_limit_per_minute: int = 60
    report_submit_rate_limit_per_minute: int = 5

    @cached_property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @cached_property
    def territory_path(self) -> Path:
        # DOC-PENDIENTE: la especificación no indica respecto de qué directorio es relativa la ruta;
        # se resuelve relativa a la carpeta backend/.
        path = Path(self.geojson_territory_path)
        return path if path.is_absolute() else (BACKEND_DIR / path).resolve()


settings = Settings()
