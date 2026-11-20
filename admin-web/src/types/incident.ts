// Incidentes públicos y zonas de concentración — docs/tecnica/02. system-contracts.md §4
import type { IncidentCategory, ReportStatus } from './report';

/** Propiedades de un incidente en GET /incidents. */
export interface IncidentProperties {
  report_id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  color: string;
  status: ReportStatus;
  status_label: string;
  address_reference: string;
  photo_url: string | null;
  has_photo: boolean;
  created_at: string;
}

/** Feature GeoJSON de incidente (Point). */
export interface IncidentFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: IncidentProperties;
}

/** Respuesta de GET /incidents. */
export interface IncidentFeatureCollection {
  type: 'FeatureCollection';
  features: IncidentFeature[];
}

/** Query params de GET /incidents. */
export interface IncidentFilters {
  category?: IncidentCategory;
  status?: ReportStatus;
  /** `min_lon,min_lat,max_lon,max_lat` */
  bbox?: string;
  start_date?: string;
  end_date?: string;
}

/** Propiedades de una zona de concentración en GET /incidents/clusters. */
export interface ClusterProperties {
  cluster_id: string;
  category: IncidentCategory;
  category_label: string;
  color: string;
  incident_count: number;
  window_start: string;
  window_end: string;
  description: string;
}

/** Feature GeoJSON de zona de concentración (Polygon). */
export interface ClusterFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  properties: ClusterProperties;
}

/** Respuesta de GET /incidents/clusters. */
export interface ClusterFeatureCollection {
  type: 'FeatureCollection';
  features: ClusterFeature[];
}

/** Respuesta de GET /incidents/{incident_id}. */
export interface IncidentDetail {
  id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  color: string;
  status: ReportStatus;
  status_label: string;
  location: {
    latitude: number;
    longitude: number;
    address_reference: string;
  };
  photo_url: string | null;
  created_at: string;
}
