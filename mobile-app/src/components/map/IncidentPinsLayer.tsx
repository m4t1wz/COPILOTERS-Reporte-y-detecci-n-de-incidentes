import React from 'react';
import { useIncidentsQuery } from '../../hooks/useIncidents';

let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default || require('@maplibre/maplibre-react-native');
} catch {
  // Entorno sin binarios nativos MapLibre
}

export interface IncidentPinsLayerProps {
  onSelectIncident: (incidentId: string) => void;
  filterCategory?: string;
}

export const IncidentPinsLayer: React.FC<IncidentPinsLayerProps> = ({
  onSelectIncident,
  filterCategory,
}) => {
  const { data: geojson } = useIncidentsQuery(
    filterCategory ? { category: filterCategory } : undefined
  );

  if (!MapLibreGL?.ShapeSource || !geojson) {
    return null;
  }

  return (
    <MapLibreGL.ShapeSource
      id="incidents-source"
      shape={geojson as any}
      onPress={(e: any) => {
        const feature = e?.features?.[0];
        const reportId = feature?.properties?.report_id || feature?.id;
        if (reportId) {
          onSelectIncident(String(reportId));
        }
      }}
    >
      <MapLibreGL.CircleLayer
        id="incident-circles"
        style={{
          circleRadius: 9,
          circleColor: ['get', 'color'],
          circleStrokeWidth: 2.5,
          circleStrokeColor: '#ffffff',
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};
