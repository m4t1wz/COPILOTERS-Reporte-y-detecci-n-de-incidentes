"""Validación de puntos dentro y fuera de Formosa (docs/03. backend.md §4.1; 07 TASK-BE-02)."""
import json
import time

import pytest
from shapely.geometry import Point, shape

from core.config import settings
from core.exceptions import OutsideTerritoryException
from services import geo_service
from tests.conftest import ASUNCION, INSIDE, RESISTENCIA


@pytest.fixture(scope="module", autouse=True)
def territory():
    geo_service.init_territory(settings.territory_path)


def test_territory_file_is_spec_file():
    assert settings.territory_path.name == "formosa.json"
    assert settings.territory_path.parent.name == "data"
    assert settings.territory_path.is_file()


def test_point_inside_formosa_capital():
    lat, lon = INSIDE
    assert geo_service.is_within_territory(lat, lon) is True
    geo_service.validate_coordinates(lat, lon)  # no lanza


@pytest.mark.parametrize("point", [ASUNCION, RESISTENCIA, (-25.2987, -56.8921)])
def test_points_outside_formosa(point):
    lat, lon = point
    assert geo_service.is_within_territory(lat, lon) is False
    with pytest.raises(OutsideTerritoryException) as exc:
        geo_service.validate_coordinates(lat, lon)
    assert exc.value.code == "OUTSIDE_TERRITORY"
    assert exc.value.status_code == 422
    assert exc.value.details == {"latitude": lat, "longitude": lon}


def test_asuncion_is_inside_bbox_but_outside_polygon():
    """El BBOX solo no alcanza: Asunción cae dentro de la caja pero fuera del polígono (ADR-003)."""
    assert geo_service.in_bounding_box(*ASUNCION) is True
    assert geo_service.is_within_territory(*ASUNCION) is False


def test_bbox_constants_match_spec():
    assert (geo_service.MIN_LON, geo_service.MAX_LON) == (-62.3424512, -57.5542601)
    assert (geo_service.MIN_LAT, geo_service.MAX_LAT) == (-26.8720109, -22.4765154)


def test_bbox_constants_enclose_geojson():
    with open(settings.territory_path, encoding="utf-8") as fh:
        polygon = shape(json.load(fh)["features"][0]["geometry"])
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    assert geo_service.MIN_LON <= min_lon and max_lon <= geo_service.MAX_LON
    assert geo_service.MIN_LAT <= min_lat and max_lat <= geo_service.MAX_LAT


def test_validation_time_under_half_millisecond():
    lat, lon = INSIDE
    iterations = 2000
    start = time.perf_counter()
    for _ in range(iterations):
        geo_service.is_within_territory(lat, lon)
    per_call_ms = (time.perf_counter() - start) * 1000 / iterations
    assert per_call_ms < 0.5


def test_inverted_mask_has_world_ring_and_formosa_hole():
    mask = geo_service.build_inverted_mask()
    geometry = mask["features"][0]["geometry"]
    assert geometry["type"] == "Polygon"
    outer, hole = geometry["coordinates"]
    assert outer == geo_service.WORLD_RING
    masked = shape(geometry)
    assert masked.is_valid
    # Formosa queda como hueco: un punto interno de la provincia no pertenece a la máscara.
    assert not masked.contains(Point(INSIDE[1], INSIDE[0]))
    assert masked.contains(Point(ASUNCION[1], ASUNCION[0]))
    assert len(hole) == len(geo_service.get_territory().exterior.coords)
