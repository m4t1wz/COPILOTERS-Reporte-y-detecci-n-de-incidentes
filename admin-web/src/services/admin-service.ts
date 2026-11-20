// Endpoints administrativos — docs/tecnica/02. system-contracts.md §6
import { apiClient } from '../core/api-client';
import type { Paginated } from '../types/common';
import type {
  AdminReportFilters,
  AdminReportItem,
  DashboardStats,
  ReportHistoryResponse,
  StatusUpdateRequest,
  StatusUpdateResponse,
} from '../types/report';
import { apiRequest, cleanParams } from './request';

export const adminService = {
  /** GET /admin/dashboard/stats */
  getDashboardStats(): Promise<DashboardStats> {
    return apiRequest(async () => (await apiClient.get<DashboardStats>('/admin/dashboard/stats')).data);
  },

  /** GET /admin/reports */
  getReports(filters: AdminReportFilters = {}): Promise<Paginated<AdminReportItem>> {
    return apiRequest(
      async () =>
        (await apiClient.get<Paginated<AdminReportItem>>('/admin/reports', { params: cleanParams(filters) })).data,
    );
  },

  /** GET /admin/reports/{report_id}/history */
  getReportHistory(id: string): Promise<ReportHistoryResponse> {
    return apiRequest(
      async () =>
        (await apiClient.get<ReportHistoryResponse>(`/admin/reports/${encodeURIComponent(id)}/history`)).data,
    );
  },

  /** PATCH /admin/reports/{report_id}/status */
  updateReportStatus(id: string, body: StatusUpdateRequest): Promise<StatusUpdateResponse> {
    return apiRequest(
      async () =>
        (await apiClient.patch<StatusUpdateResponse>(`/admin/reports/${encodeURIComponent(id)}/status`, body)).data,
    );
  },
};
