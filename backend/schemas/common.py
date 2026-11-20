"""Esquemas comunes: enumeraciones, paginación y error RFC 7807 (docs/02. system-contracts.md §1-§2)."""
import math
from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any, Generic, TypeVar

from pydantic import BaseModel, PlainSerializer


def iso_utc(value: datetime) -> str:
    """ISO 8601 UTC con milisegundos: YYYY-MM-DDTHH:mm:ss.sssZ (02 §1.3)."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


UTCDateTime = Annotated[datetime, PlainSerializer(iso_utc, return_type=str)]


class ReportStatus(str, Enum):
    pendiente = "pendiente"
    en_revision = "en_revision"
    verificado = "verificado"
    descartado = "descartado"
    en_seguimiento = "en_seguimiento"
    resuelto = "resuelto"


class IncidentCategory(str, Enum):
    calle_anegada = "calle_anegada"
    camino_interrumpido = "camino_interrumpido"
    desborde_rio_riacho = "desborde_rio_riacho"
    vivienda_estructura_daniada = "vivienda_estructura_daniada"
    arbol_caido = "arbol_caido"
    obstruccion_desague = "obstruccion_desague"
    poste_cable_caido = "poste_cable_caido"
    danos_infraestructura_publica = "danos_infraestructura_publica"
    corte_servicios_basicos = "corte_servicios_basicos"
    otro = "otro"


class UserRole(str, Enum):
    citizen = "citizen"
    admin = "admin"


STATUS_LABELS: dict[str, str] = {
    "pendiente": "Pendiente",
    "en_revision": "En revisión",
    "verificado": "Verificado",
    "descartado": "Descartado",
    "en_seguimiento": "En seguimiento",
    "resuelto": "Resuelto",
}

CATEGORY_LABELS: dict[str, str] = {
    "calle_anegada": "Calle anegada",
    "camino_interrumpido": "Camino interrumpido",
    "desborde_rio_riacho": "Desborde de río o riacho",
    "vivienda_estructura_daniada": "Vivienda o estructura dañada",
    "arbol_caido": "Árbol caído",
    "obstruccion_desague": "Obstrucción de desagüe",
    "poste_cable_caido": "Poste o cable caído",
    "danos_infraestructura_publica": "Daños en infraestructura pública",
    "corte_servicios_basicos": "Corte de servicios básicos",
    "otro": "Otro",
}

CATEGORY_COLORS: dict[str, str] = {
    "calle_anegada": "#2196F3",
    "camino_interrumpido": "#F57C00",
    "desborde_rio_riacho": "#1565C0",
    "vivienda_estructura_daniada": "#D32F2F",
    "arbol_caido": "#558B2F",
    "obstruccion_desague": "#00897B",
    "poste_cable_caido": "#F9A825",
    "danos_infraestructura_publica": "#7E57C2",
    "corte_servicios_basicos": "#607D8B",
    "otro": "#757575",
}


def format_report_number(number: int) -> str:
    """Número amigable '#00142' (02 §1.2; ADR-008)."""
    return f"#{number:05d}"


# --- Error RFC 7807 (02 §1.4) ---
class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any = None
    timestamp: str


class ErrorResponse(BaseModel):
    error: ErrorBody


# --- Paginación (02 §1.5) ---
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def build(cls, page: int, page_size: int, total_items: int) -> "Pagination":
        # DOC-PENDIENTE: total_pages con 0 resultados no está definido; se devuelve 0.
        total_pages = math.ceil(total_items / page_size) if total_items else 0
        return cls(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    pagination: Pagination
