import { apiClient } from './api';
import {
  ClusterFeatureCollection,
  IncidentDetail,
  IncidentFeatureCollection,
} from '../types';

export const incidentService = {
  /**
   * Consulta pública de incidentes activos en formato GeoJSON FeatureCollection
   * GET /api/v1/incidents
   */
  async getIncidents(params?: {
    category?: string;
    status?: string;
    bbox?: string;
  }): Promise<IncidentFeatureCollection> {
    const response = await apiClient.get<IncidentFeatureCollection>('/incidents', { params });
    return response.data;
  },

  /**
   * Consulta pública de zonas poligonales de concentración (clusters)
   * GET /api/v1/incidents/clusters
   */
  async getClusters(): Promise<ClusterFeatureCollection> {
    const response = await apiClient.get<ClusterFeatureCollection>('/incidents/clusters');
    return response.data;
  },

  /**
   * Consulta del detalle público de un incidente para la ficha modal del mapa
   * GET /api/v1/incidents/{incident_id}
   */
  async getIncidentDetail(incidentId: string): Promise<IncidentDetail> {
    const response = await apiClient.get<IncidentDetail>(`/incidents/${incidentId}`);
    return response.data;
  },
};
