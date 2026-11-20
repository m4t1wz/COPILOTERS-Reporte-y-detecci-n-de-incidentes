// Métricas consolidadas — GET /admin/dashboard/stats
import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '../core/api-client';
import { adminService } from '../services/admin-service';
import type { DashboardStats } from '../types/report';
import { queryKeys } from './query-keys';

export function useDashboardStats() {
  return useQuery<DashboardStats, ApiError>({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => adminService.getDashboardStats(),
    refetchInterval: 60_000,
  });
}
