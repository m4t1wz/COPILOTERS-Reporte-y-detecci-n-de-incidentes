// Claves de TanStack Query estables y jerárquicas: invalidar un prefijo refresca todo lo que cuelga de él.
import type { IncidentFilters } from '../types/incident';
import type { AdminReportFilters } from '../types/report';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  dashboardStats: () => ['dashboard', 'stats'] as const,

  incidents: ['incidents'] as const,
  incidentList: (filters: IncidentFilters) => ['incidents', 'list', filters] as const,
  clusters: () => ['incidents', 'clusters'] as const,
  incidentDetail: (id: string) => ['incidents', 'detail', id] as const,

  reports: ['reports'] as const,
  reportList: (filters: AdminReportFilters) => ['reports', 'list', filters] as const,
  reportItem: (id: string) => ['reports', 'item', id] as const,
  reportHistory: (id: string) => ['reports', 'history', id] as const,
};
