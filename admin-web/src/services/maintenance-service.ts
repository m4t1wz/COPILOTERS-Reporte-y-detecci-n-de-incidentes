// Borrado de datos para pruebas — POST /admin/maintenance/reset (docs/tecnica/03. backend.md §4.7).
// Solo administradores y solo si el backend tiene ENABLE_DATA_RESET=true (si no, responde 404).
import { apiClient } from '../core/api-client';
import { apiRequest } from './request';

export type ResetScope = 'agrupaciones' | 'reportes' | 'cuentas' | 'todo';

export interface ResetResponse {
  scope: ResetScope;
  deleted: { reportes: number; historial: number; agrupaciones: number; fotos: number; cuentas: number };
}

export const CONFIRMATION_WORD = 'BORRAR';

export const maintenanceService = {
  reset(scope: ResetScope, confirmation: string): Promise<ResetResponse> {
    return apiRequest(
      async () => (await apiClient.post<ResetResponse>('/admin/maintenance/reset', { scope, confirmation })).data,
    );
  },
};
