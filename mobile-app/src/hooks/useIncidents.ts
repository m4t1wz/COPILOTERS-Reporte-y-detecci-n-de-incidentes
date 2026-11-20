import { QueryClient, useQuery } from '@tanstack/react-query';
import { incidentService } from '../services/incident-service';

export const useIncidentsQuery = (params?: { category?: string; status?: string; bbox?: string }) => {
  return useQuery({
    queryKey: ['incidents', params],
    queryFn: () => incidentService.getIncidents(params),
    staleTime: 1000 * 30, // 30 segundos de caché
    // El mapa no se desmonta al navegar: sin esto, un reporte resuelto o descartado seguía visible
    // hasta reiniciar la app. Se refresca al volver a primer plano y cada 60 s.
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60,
  });
};

export const useClustersQuery = () => {
  return useQuery({
    queryKey: ['incident-clusters'],
    queryFn: () => incidentService.getClusters(),
    staleTime: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60,
  });
};

export const useIncidentDetailQuery = (incidentId?: string) => {
  return useQuery({
    queryKey: ['incident-detail', incidentId],
    queryFn: () => (incidentId ? incidentService.getIncidentDetail(incidentId) : null),
    enabled: !!incidentId,
  });
};

/** Claves del mapa público; se invalidan al volver a la pantalla del mapa y tras enviar un reporte. */
export const MAP_QUERY_KEYS = [['incidents'], ['incident-clusters']] as const;

export const refreshMapQueries = (queryClient: QueryClient) =>
  Promise.all(MAP_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })));
