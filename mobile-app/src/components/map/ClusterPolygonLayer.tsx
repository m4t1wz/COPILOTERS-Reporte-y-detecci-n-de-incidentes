import React from 'react';
import { useClustersQuery } from '../../hooks/useIncidents';

let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default || require('@maplibre/maplibre-react-native');
} catch {
  // Entorno sin binarios nativos MapLibre
}

export const ClusterPolygonLayer: React.FC = () => {
  const { data: clustersGeoJson } = useClustersQuery();

  if (!MapLibreGL?.ShapeSource || !clustersGeoJson) {
    return null;
  }

  return (
    <MapLibreGL.ShapeSource id="clusters-source" shape={clustersGeoJson as any}>
      <MapLibreGL.FillLayer
        id="clusters-fill"
        style={{
          fillColor: ['get', 'color'],
          fillOpacity: 0.35,
        }}
      />
      <MapLibreGL.LineLayer
        id="clusters-stroke"
        style={{
          lineColor: ['get', 'color'],
          lineWidth: 2,
          lineDasharray: [2, 1],
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};
