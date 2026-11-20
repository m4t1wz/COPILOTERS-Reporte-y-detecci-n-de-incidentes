// Conformidad de tipos con los ejemplos literales de docs/tecnica/02. system-contracts.md.
// Si un tipo se desvía del contrato, `tsc --noEmit` falla.
import { describe, expect, it } from 'vitest';
import type { LoginResponse, RefreshResponse } from '../types/auth';
import type { APIErrorResponse, Paginated } from '../types/common';
import type {
  ClusterFeatureCollection,
  IncidentDetail,
  IncidentFeatureCollection,
} from '../types/incident';
import type {
  AdminReportItem,
  DashboardStats,
  ReportHistoryResponse,
  StatusUpdateRequest,
  StatusUpdateResponse,
} from '../types/report';

const login: LoginResponse = {
  user: {
    id: 'e1f2a3b4-5678-90ab-cdef-1234567890ab',
    email: 'operador@formosa.gob.ar',
    full_name: 'Ing. María González',
    phone_number: '+543704987654',
    role: 'admin',
  },
  session: {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refresh_token: 'b1c2d3e4-...',
    token_type: 'bearer',
    expires_in: 3600,
  },
};

const refresh: RefreshResponse = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'c2d3e4f5-6789-01bc-def0-2345678901bc',
  token_type: 'bearer',
  expires_in: 3600,
};

const apiError: APIErrorResponse = {
  error: {
    code: 'OUTSIDE_TERRITORY',
    message: 'La coordenada especificada no pertenece al territorio de la provincia de Formosa.',
    details: { latitude: -25.2987, longitude: -56.8921 },
    timestamp: '2026-11-18T18:30:00.000Z',
  },
};

const incidents: IncidentFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
      geometry: { type: 'Point', coordinates: [-58.1738, -26.1852] },
      properties: {
        report_id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
        report_number: '#00142',
        category: 'calle_anegada',
        category_label: 'Calle anegada',
        color: '#2196F3',
        status: 'verificado',
        status_label: 'Verificado',
        address_reference: 'Av. 25 de Mayo y Calle Fontana, Formosa Capital',
        photo_url: 'https://xyz.supabase.co/storage/v1/object/public/incident-photos/reports/2026/11/9f8e7d6c.jpg',
        has_photo: true,
        created_at: '2026-11-18T14:22:10.000Z',
      },
    },
  ],
};

const clusters: ClusterFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'cluster-ca-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-58.178, -26.182],
            [-58.172, -26.181],
            [-58.171, -26.187],
            [-58.176, -26.188],
            [-58.178, -26.182],
          ],
        ],
      },
      properties: {
        cluster_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        category: 'calle_anegada',
        category_label: 'Calle anegada',
        color: '#2196F3',
        incident_count: 4,
        window_start: '2026-11-10T08:00:00.000Z',
        window_end: '2026-11-18T14:30:00.000Z',
        description: 'Zona de concentración de anegamiento (4 reportes activos)',
      },
    },
  ],
};

const incidentDetail: IncidentDetail = {
  id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
  report_number: '#00142',
  category: 'calle_anegada',
  category_label: 'Calle anegada',
  color: '#2196F3',
  status: 'verificado',
  status_label: 'Verificado',
  location: {
    latitude: -26.1852,
    longitude: -58.1738,
    address_reference: 'Av. 25 de Mayo y Calle Fontana, Formosa Capital',
  },
  photo_url: 'https://xyz.supabase.co/storage/v1/object/public/incident-photos/reports/2026/11/9f8e7d6c.jpg',
  created_at: '2026-11-18T14:22:10.000Z',
};

const stats: DashboardStats = {
  total_reports: 254,
  pending_reports: 18,
  in_review_reports: 12,
  verified_reports: 85,
  in_progress_reports: 42,
  resolved_reports: 81,
  discarded_reports: 16,
  active_clusters_count: 6,
  last_updated: '2026-11-18T15:30:00.000Z',
};

const adminReports: Paginated<AdminReportItem> = {
  items: [
    {
      id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
      report_number: '#00142',
      category: 'calle_anegada',
      category_label: 'Calle anegada',
      created_at: '2026-11-18T14:22:10.000Z',
      location: {
        latitude: -26.1852,
        longitude: -58.1738,
        address_reference: 'Av. 25 de Mayo y Calle Fontana, Formosa Capital',
      },
      photo_url: 'https://xyz.supabase.co/storage/v1/object/public/incident-photos/reports/2026/11/9f8e7d6c.jpg',
      citizen_comment: 'El agua supera la vereda e ingresa a los domicilios.',
      current_status: 'pendiente',
      citizen: {
        id: 'c7a8b9d0-1234-4567-89ab-cdef01234567',
        full_name: 'Juan Pérez',
        phone_number: '+543704123456',
      },
    },
  ],
  pagination: {
    page: 1,
    page_size: 20,
    total_items: 18,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  },
};

const statusRequest: StatusUpdateRequest = {
  new_status: 'en_seguimiento',
  admin_comment: 'Se procedió a destapar las bocas de tormenta de la intersección. Continúa bombeo.',
  notify_citizen: true,
};

const statusResponse: StatusUpdateResponse = {
  report_id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
  report_number: '#00142',
  previous_status: 'verificado',
  current_status: 'en_seguimiento',
  admin_comment: 'Se procedió a destapar las bocas de tormenta de la intersección. Continúa bombeo.',
  updated_at: '2026-11-18T15:10:00.000Z',
  operator: { id: 'e1f2a3b4-5678-90ab-cdef-1234567890ab', full_name: 'Ing. María González' },
};

const history: ReportHistoryResponse = {
  report_id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
  report_number: '#00142',
  history: [
    {
      id: '11111111-2222-3333-4444-555555555555',
      previous_status: null,
      new_status: 'pendiente',
      admin_comment: null,
      changed_by: { user_id: 'c7a8b9d0-1234-4567-89ab-cdef01234567', role: 'citizen', name: 'Juan Pérez' },
      created_at: '2026-11-18T14:22:10.000Z',
    },
    {
      id: '22222222-3333-4444-5555-666666666666',
      previous_status: 'pendiente',
      new_status: 'en_revision',
      admin_comment: 'Asignado a cuadrilla zona centro.',
      changed_by: {
        user_id: 'e1f2a3b4-5678-90ab-cdef-1234567890ab',
        role: 'admin',
        name: 'Ing. María González',
      },
      created_at: '2026-11-18T14:45:00.000Z',
    },
  ],
};

describe('Tipos alineados a system-contracts.md', () => {
  it('los ejemplos del contrato se tipan sin errores', () => {
    const samples = [
      login, refresh, apiError, incidents, clusters, incidentDetail,
      stats, adminReports, statusRequest, statusResponse, history,
    ];
    expect(samples.every((s) => s !== undefined)).toBe(true);
    expect(login.user.role).toBe('admin');
    expect(history.history[0].previous_status).toBeNull();
  });
});
