"""GeoJSON de zonas de concentración (docs/02. system-contracts.md §4, endpoint Clusters)."""
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from schemas.common import IncidentCategory, UTCDateTime


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[tuple[float, float]]]


class ClusterProperties(BaseModel):
    cluster_id: UUID
    category: IncidentCategory
    category_label: str
    color: str
    incident_count: int
    window_start: UTCDateTime
    window_end: UTCDateTime
    description: str


class ClusterFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    # DOC-PENDIENTE: el contrato muestra "cluster-ca-001" sin regla de formación; se usa el UUID del cluster.
    id: str
    geometry: PolygonGeometry
    properties: ClusterProperties


class ClusterFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[ClusterFeature]
