"""Esquemas de reportes: creación, confirmación, mis reportes, administración e historial
(docs/02. system-contracts.md §5-§6; docs/03. backend.md §5.1)."""
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ValidationInfo, field_validator, model_validator
from pydantic_core import PydanticCustomError

from schemas.common import IncidentCategory, Page, ReportStatus, UserRole, UTCDateTime

COMMENT_OR_PHOTO_ERROR_TYPE = "comment_or_photo_required"


class ReportCreateSchema(BaseModel):
    category: IncidentCategory
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    comment: Optional[str] = Field(None, max_length=1000)

    @field_validator("comment", mode="before")
    @classmethod
    def normalize_comment(cls, value):
        # Un comentario vacío o compuesto solo por espacios se considera ausente (03 §5.1).
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_photo_or_comment(self, info: ValidationInfo):
        # El controlador multipart informa en el contexto si llegó un archivo binario.
        has_photo = bool((info.context or {}).get("has_photo"))
        if not has_photo and self.comment is None:
            raise PydanticCustomError(
                COMMENT_OR_PHOTO_ERROR_TYPE,
                "Debe proporcionar una fotografía o redactar un comentario descriptivo de la situación.",
            )
        return self


class StatusUpdateSchema(BaseModel):
    new_status: ReportStatus
    admin_comment: Optional[str] = Field(None, min_length=5, max_length=1000)
    notify_citizen: bool = True


class Location(BaseModel):
    latitude: float
    longitude: float
    address_reference: str


class LocationWithDisplay(Location):
    display_text: str


# --- POST /reports (201) ---
class ReportConfirmation(BaseModel):
    success: bool = True
    message: str = "Reporte enviado correctamente"
    report_id: UUID
    report_number: str
    category: IncidentCategory
    category_label: str
    location: Location
    created_at: UTCDateTime
    status: ReportStatus
    status_label: str
    status_message: str
    photo_url: Optional[str]


class ReportConfirmationResponse(BaseModel):
    confirmation: ReportConfirmation


# --- GET /reports/me ---
class MyReportItem(BaseModel):
    id: UUID
    report_number: str
    category: IncidentCategory
    category_label: str
    color: str
    photo_url: Optional[str]
    location: Location
    created_at: UTCDateTime
    current_status: ReportStatus
    current_status_label: str


MyReportsPage = Page[MyReportItem]


# --- GET /reports/me/{report_id} ---
class TimelineItem(BaseModel):
    step_order: int
    status: ReportStatus
    title: str
    description: str
    admin_comment: Optional[str]
    timestamp: UTCDateTime


class MyReportDetail(BaseModel):
    id: UUID
    report_number: str
    category: IncidentCategory
    category_label: str
    color: str
    photo_url: Optional[str]
    comment: Optional[str]
    location: LocationWithDisplay
    current_status: ReportStatus
    current_status_label: str
    timeline: list[TimelineItem]


# --- GET /admin/dashboard/stats ---
class DashboardStats(BaseModel):
    total_reports: int
    pending_reports: int
    in_review_reports: int
    verified_reports: int
    in_progress_reports: int
    resolved_reports: int
    discarded_reports: int
    active_clusters_count: int
    last_updated: UTCDateTime


# --- GET /admin/reports ---
class CitizenInfo(BaseModel):
    id: UUID
    full_name: str
    phone_number: Optional[str]


class AdminReportItem(BaseModel):
    id: UUID
    report_number: str
    category: IncidentCategory
    category_label: str
    created_at: UTCDateTime
    location: Location
    photo_url: Optional[str]
    citizen_comment: Optional[str]
    current_status: ReportStatus
    citizen: CitizenInfo


AdminReportsPage = Page[AdminReportItem]


# --- PATCH /admin/reports/{report_id}/status ---
class OperatorInfo(BaseModel):
    id: UUID
    full_name: str


class StatusUpdateResponse(BaseModel):
    report_id: UUID
    report_number: str
    previous_status: ReportStatus
    current_status: ReportStatus
    admin_comment: Optional[str]
    updated_at: UTCDateTime
    operator: OperatorInfo


# --- GET /admin/reports/{report_id}/history ---
class ChangedBy(BaseModel):
    user_id: UUID
    role: UserRole
    name: str


class HistoryItem(BaseModel):
    id: UUID
    previous_status: Optional[ReportStatus]
    new_status: ReportStatus
    admin_comment: Optional[str]
    changed_by: ChangedBy
    created_at: UTCDateTime


class ReportHistoryResponse(BaseModel):
    report_id: UUID
    report_number: str
    history: list[HistoryItem]
