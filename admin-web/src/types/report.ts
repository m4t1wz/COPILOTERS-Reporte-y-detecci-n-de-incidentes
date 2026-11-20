// Reportes y gestión administrativa — docs/tecnica/02. system-contracts.md §2.1, §2.2, §6
import type { UserRole } from './auth';
import type { PaginationParams } from './common';

/** Estados del reporte (§2.1). */
export type ReportStatus =
  | 'pendiente'
  | 'en_revision'
  | 'verificado'
  | 'descartado'
  | 'en_seguimiento'
  | 'resuelto';

/** Categorías del incidente (§2.2). */
export type IncidentCategory =
  | 'calle_anegada'
  | 'camino_interrumpido'
  | 'desborde_rio_riacho'
  | 'vivienda_estructura_daniada'
  | 'arbol_caido'
  | 'obstruccion_desague'
  | 'poste_cable_caido'
  | 'danos_infraestructura_publica'
  | 'corte_servicios_basicos'
  | 'otro';

/** Ubicación de un reporte (§6, listado administrativo). */
export interface ReportLocation {
  latitude: number;
  longitude: number;
  address_reference: string;
}

/** Datos del ciudadano denunciante (§6, listado administrativo). */
export interface ReportCitizen {
  id: string;
  full_name: string;
  phone_number: string | null;
}

/** Item de GET /admin/reports (§6). */
export interface AdminReportItem {
  id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  created_at: string;
  location: ReportLocation;
  photo_url: string | null;
  citizen_comment: string | null;
  current_status: ReportStatus;
  citizen: ReportCitizen;
}

/** Query params de GET /admin/reports (§6). */
export interface AdminReportFilters extends PaginationParams {
  status?: ReportStatus;
  category?: IncidentCategory;
  start_date?: string;
  end_date?: string;
  search?: string;
}

/** Respuesta de GET /admin/dashboard/stats (§6). */
export interface DashboardStats {
  total_reports: number;
  pending_reports: number;
  in_review_reports: number;
  verified_reports: number;
  in_progress_reports: number;
  resolved_reports: number;
  discarded_reports: number;
  active_clusters_count: number;
  last_updated: string;
}

/** Cuerpo de PATCH /admin/reports/{id}/status (§6). */
export interface StatusUpdateRequest {
  new_status: ReportStatus;
  admin_comment: string;
  notify_citizen: boolean;
}

/** Operador responsable del cambio (§6). */
export interface StatusUpdateOperator {
  id: string;
  full_name: string;
}

/** Respuesta 200 de PATCH /admin/reports/{id}/status (§6). */
export interface StatusUpdateResponse {
  report_id: string;
  report_number: string;
  previous_status: ReportStatus;
  current_status: ReportStatus;
  admin_comment: string;
  updated_at: string;
  operator: StatusUpdateOperator;
}

/** Autor de un evento de historial (§6). */
export interface HistoryChangedBy {
  user_id: string;
  role: UserRole;
  name: string;
}

/** Evento de historial (§6). */
export interface HistoryItem {
  id: string;
  previous_status: ReportStatus | null;
  new_status: ReportStatus;
  admin_comment: string | null;
  changed_by: HistoryChangedBy;
  created_at: string;
}

/** Respuesta de GET /admin/reports/{id}/history (§6). */
export interface ReportHistoryResponse {
  report_id: string;
  report_number: string;
  history: HistoryItem[];
}
