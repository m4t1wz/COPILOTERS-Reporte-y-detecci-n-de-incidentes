// Queries y mutaciones de reportes — docs/tecnica/04. admin-web.md §2 (hooks/use-reports.ts), §6.4
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { ApiError } from '../core/api-client';
import { adminService } from '../services/admin-service';
import type { Paginated } from '../types/common';
import type {
  AdminReportFilters,
  AdminReportItem,
  ReportHistoryResponse,
  StatusUpdateRequest,
  StatusUpdateResponse,
} from '../types/report';
import { queryKeys } from './query-keys';

export function useReports(filters: AdminReportFilters) {
  return useQuery<Paginated<AdminReportItem>, ApiError>({
    queryKey: queryKeys.reportList(filters),
    queryFn: () => adminService.getReports(filters),
    placeholderData: keepPreviousData,
  });
}

export function useReportHistory(id: string | undefined) {
  return useQuery<ReportHistoryResponse, ApiError>({
    queryKey: queryKeys.reportHistory(id ?? ''),
    queryFn: () => adminService.getReportHistory(id!),
    enabled: Boolean(id),
  });
}

/** Busca un item de GET /admin/reports ya cargado en caché (DOC-PENDIENTE-02). */
export function findCachedReportItem(queryClient: QueryClient, id: string): AdminReportItem | undefined {
  const lists = queryClient.getQueriesData<Paginated<AdminReportItem>>({ queryKey: [...queryKeys.reports, 'list'] });
  for (const [, data] of lists) {
    const found = data?.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Sin caché, consulta GET /admin/reports?search=<report_number> y toma el item con el mismo id. */
export async function fetchReportItem(
  queryClient: QueryClient,
  id: string,
  reportNumber: string | undefined,
): Promise<AdminReportItem | null> {
  const cached = findCachedReportItem(queryClient, id);
  if (cached) return cached;
  if (!reportNumber) return null;
  const result = await adminService.getReports({ search: reportNumber, page_size: 100 });
  return result.items.find((item) => item.id === id) ?? null;
}

/**
 * Datos administrativos de un reporte (ciudadano y comentario) para la ficha.
 * Compone caché + búsqueda por número sin inventar endpoints (DOC-PENDIENTE-02).
 */
export function useAdminReportItem(id: string | undefined, reportNumber: string | undefined) {
  const queryClient = useQueryClient();
  const cached = id ? findCachedReportItem(queryClient, id) : undefined;
  return useQuery<AdminReportItem | null, ApiError>({
    queryKey: queryKeys.reportItem(id ?? ''),
    queryFn: () => fetchReportItem(queryClient, id!, reportNumber),
    enabled: Boolean(id) && (Boolean(cached) || Boolean(reportNumber)),
    initialData: cached,
  });
}

/** Revalida reportes, historial, incidentes, clusters y métricas tras un cambio de estado. */
export async function invalidateAfterStatusChange(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    queryClient.invalidateQueries({ queryKey: queryKeys.incidents }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export interface UpdateStatusVariables {
  id: string;
  body: StatusUpdateRequest;
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation<StatusUpdateResponse, ApiError, UpdateStatusVariables>({
    mutationFn: ({ id, body }) => adminService.updateReportStatus(id, body),
    onSuccess: () => invalidateAfterStatusChange(queryClient),
  });
}
