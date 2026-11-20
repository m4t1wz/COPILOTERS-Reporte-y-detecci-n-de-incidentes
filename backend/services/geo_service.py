"""Validación territorial con formosa.json y Shapely (docs/03. backend.md §4.1; ADR-003; ADR-006)."""
import json
from pathlib import Path

from shapely.geometry import Point, Polygon, mapping, shape
from shapely.geometry.polygon import orient
from shapely.prepared import PreparedGeometry, prep

from core.exceptions import OutsideTerritoryException

# Filtro rápido (Bounding Box) — valores literales de 03 §4.1.
MIN_LON = -62.3424512
MAX_LON = -57.5542601
MIN_LAT = -26.8720109
MAX_LAT = -22.4765154

WORLD_RING = [[-180.0, -90.0], [180.0, -90.0], [180.0, 90.0], [-180.0, 90.0], [-180.0, -90.0]]

_territory: Polygon | None = None
_prepared: PreparedGeometry | None = None


def _extract_geometry(data: dict) -> dict:
    if data.get("type") == "FeatureCollection":
        return data["features"][0]["geometry"]
    if data.get("type") == "Feature":
        return data["geometry"]
    return data


def init_territory(path: Path | str) -> None:
    """Carga formosa.json una única vez y construye la geometría preparada en memoria."""
    global _territory, _prepared
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    geometry = shape(_extract_geometry(data))
    if not isinstance(geometry, Polygon):
        raise ValueError("formosa.json debe contener un Polygon")
    _territory = geometry
    _prepared = prep(geometry)


def is_territory_loaded() -> bool:
    return _prepared is not None


def get_territory() -> Polygon:
    if _territory is None:
        raise RuntimeError("Territorio no inicializado: ejecutar init_territory()")
    return _territory


def in_bounding_box(latitude: float, longitude: float) -> bool:
    return MIN_LON <= longitude <= MAX_LON and MIN_LAT <= latitude <= MAX_LAT


def is_within_territory(latitude: float, longitude: float) -> bool:
    if not in_bounding_box(latitude, longitude):
        return False
    if _prepared is None:
        raise RuntimeError("Territorio no inicializado: ejecutar init_territory()")
    return _prepared.contains(Point(longitude, latitude))


def validate_coordinates(latitude: float, longitude: float) -> None:
    """Lanza OutsideTerritoryException si el punto no está dentro de Formosa."""
    if not is_within_territory(latitude, longitude):
        raise OutsideTerritoryException(details={"latitude": latitude, "longitude": longitude})


def build_inverted_mask() -> dict:
    """Máscara invertida: anillo exterior mundial con Formosa como hueco interior (ADR-006)."""
    territory = orient(get_territory(), sign=-1.0)  # anillo de Formosa en sentido horario (hueco RFC 7946)
    hole = [list(coord) for coord in mapping(territory)["coordinates"][0]]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {"type": "Polygon", "coordinates": [WORLD_RING, hole]},
            }
        ],
    }
