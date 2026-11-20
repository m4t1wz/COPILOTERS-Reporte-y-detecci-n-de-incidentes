// Endpoints públicos de incidentes — docs/tecnica/02. system-contracts.md §4
import { apiClient } from '../core/api-client';
import type {
  ClusterFeatureCollection,
  IncidentDetail,
  IncidentFeatureCollection,
  IncidentFilters,
} from '../types/incident';
import { apiRequest, cleanParams } from './request';

export const incidentService = {
  /** GET /incidents */
  getIncidents(filters: IncidentFilters = {}): Promise<IncidentFeatureCollection> {
    return apiRequest(
      async () =>
        (await apiClient.get<IncidentFeatureCollection>('/incidents', { params: cleanParams(filters) })).data,
    );
  },

  /** GET /incidents/clusters */
  getClusters(): Promise<ClusterFeatureCollection> {
    return apiRequest(async () => (await apiClient.get<ClusterFeatureCollection>('/incidents/clusters')).data);
  },

  /** GET /incidents/{incident_id} */
  getIncidentDetail(id: string): Promise<IncidentDetail> {
    return apiRequest(
      async () => (await apiClient.get<IncidentDetail>(`/incidents/${encodeURIComponent(id)}`)).data,
    );
  },
};
