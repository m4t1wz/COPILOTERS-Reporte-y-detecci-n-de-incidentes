"""GeoJSON de incidentes públicos (docs/02. system-contracts.md §4)."""
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel

from schemas.common import IncidentCategory, ReportStatus, UTCDateTime
from schemas.report import Location


class PointGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]  # [longitude, latitude]


class IncidentProperties(BaseModel):
    report_id: UUID
    report_number: str
    category: IncidentCategory
    category_label: str
    color: str
    status: ReportStatus
    status_label: str
    address_reference: str
    photo_url: Optional[str]
    has_photo: bool
    created_at: UTCDateTime


class IncidentFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: UUID
    geometry: PointGeometry
    properties: IncidentProperties


class IncidentFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[IncidentFeature]


class IncidentDetail(BaseModel):
    id: UUID
    report_number: str
    category: IncidentCategory
    category_label: str
    color: str
    status: ReportStatus
    status_label: str
    location: Location
    photo_url: Optional[str]
    created_at: UTCDateTime
