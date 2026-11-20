export type IncidentCategory =
  | 'calle_anegada'
  | 'camino_interrumpido'
  | 'desborde_rio_riacho'
  | 'vivienda_estructura_daniada'
  | 'arbol_caido'
  | 'obstruccion_desague'
  | 'poste_cable_caido'
  | 'danos_infraestructura_publica'
  | 'corte_servicios_basicos'
  | 'otro';

export type ReportStatus =
  | 'pendiente'
  | 'en_revision'
  | 'verificado'
  | 'descartado'
  | 'en_seguimiento'
  | 'resuelto';

export interface IncidentProperties {
  report_id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  color: string;
  status: ReportStatus;
  status_label: string;
  address_reference: string;
  photo_url?: string | null;
  has_photo: boolean;
  created_at: string;
}

export interface IncidentFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: IncidentProperties;
}

export interface IncidentFeatureCollection {
  type: 'FeatureCollection';
  features: IncidentFeature[];
}

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

export interface ClusterFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lon, lat], ... ] ]
  };
  properties: ClusterProperties;
}

export interface ClusterFeatureCollection {
  type: 'FeatureCollection';
  features: ClusterFeature[];
}

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
  photo_url?: string | null;
  created_at: string;
}
