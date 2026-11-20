// GeoJSON del mapa y zonas de concentración — GET /incidents, /incidents/clusters, /incidents/{id}
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ApiError } from '../core/api-client';
import { incidentService } from '../services/incident-service';
import type {
  ClusterFeatureCollection,
  IncidentDetail,
  IncidentFeatureCollection,
  IncidentFilters,
} from '../types/incident';
import { queryKeys } from './query-keys';

export function useIncidents(filters: IncidentFilters = {}) {
  return useQuery<IncidentFeatureCollection, ApiError>({
    queryKey: queryKeys.incidentList(filters),
    queryFn: () => incidentService.getIncidents(filters),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    // Cambios hechos por otros operadores (p. ej. un reporte resuelto sale del mapa) al volver a la pestaña.
    refetchOnWindowFocus: true,
  });
}

export function useClusters() {
  return useQuery<ClusterFeatureCollection, ApiError>({
    queryKey: queryKeys.clusters(),
    queryFn: () => incidentService.getClusters(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useIncidentDetail(id: string | undefined) {
  return useQuery<IncidentDetail, ApiError>({
    queryKey: queryKeys.incidentDetail(id ?? ''),
    queryFn: () => incidentService.getIncidentDetail(id!),
    enabled: Boolean(id),
  });
}
