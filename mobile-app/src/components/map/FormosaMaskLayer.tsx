import React from 'react';
import formosaMaskData from '../../../assets/geo/formosa-mask.json';

// Importación segura de MapLibreGL
let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default || require('@maplibre/maplibre-react-native');
} catch {
  // Entorno sin binarios nativos MapLibre
}

export const FormosaMaskLayer: React.FC = () => {
  if (!MapLibreGL?.ShapeSource) {
    return null;
  }

  return (
    <MapLibreGL.ShapeSource id="formosa-mask-source" shape={formosaMaskData as any}>
      <MapLibreGL.FillLayer
        id="mask-fill"
        style={{
          fillColor: '#0f172a', // Slate 900 oscuro
          fillOpacity: 0.65,    // Oscurece el exterior destacando Formosa
        }}
      />
      <MapLibreGL.LineLayer
        id="mask-border"
        style={{
          lineColor: '#0284c7', // Borde celeste brillante
          lineWidth: 2,
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};
