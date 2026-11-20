import { apiClient } from './api';
import {
  MyReportDetail,
  MyReportsResponse,
  ReportConfirmation,
  ReportConfirmationResponse,
  ReportCreatePayload,
} from '../types';

export const reportService = {
  /**
   * Envía un nuevo reporte ciudadano
   * POST /api/v1/reports
   * Content-Type: multipart/form-data
   */
  async submitReport(payload: ReportCreatePayload): Promise<ReportConfirmation> {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('latitude', String(payload.latitude));
    formData.append('longitude', String(payload.longitude));

    if (payload.comment) {
      formData.append('comment', payload.comment.trim());
    }

    if (payload.photo && payload.photo.uri) {
      const file = {
        uri: payload.photo.uri,
        name: payload.photo.name || 'reporte-foto.jpg',
        type: payload.photo.type || 'image/jpeg',
      } as any;
      formData.append('photo', file);
    }

    const response = await apiClient.post<ReportConfirmationResponse>('/reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.confirmation;
  },

  /**
   * Consulta el listado de reportes creados por el ciudadano autenticado
   * GET /api/v1/reports/me
   */
  async getMyReports(page = 1, pageSize = 20): Promise<MyReportsResponse> {
    const response = await apiClient.get<MyReportsResponse>('/reports/me', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Obtiene la ficha completa y el Timeline vertical de un reporte propio
   * GET /api/v1/reports/me/{report_id}
   */
  async getMyReportDetail(reportId: string): Promise<MyReportDetail> {
    const response = await apiClient.get<MyReportDetail>(`/reports/me/${reportId}`);
    return response.data;
  },
};
