export const MAP_CONFIG = {
  // Servidor de mosaicos vectoriales abierto
  STYLE_URL: 'https://tiles.openfreemap.org/styles/liberty',

  // Centro geográfico de la provincia de Formosa
  FORMOSA_CENTER: [-59.94836, -24.67426] as [number, number],

  // Niveles de Zoom
  DEFAULT_ZOOM: 7.2,
  MIN_ZOOM: 6.5,
  MAX_ZOOM: 18.0,

  // Límites máximos de desplazamiento (BBOX con margen de seguridad)
  FORMOSA_BOUNDS: {
    ne: [-57.3000, -22.2000] as [number, number], // Noreste
    sw: [-62.6000, -27.1000] as [number, number], // Suroeste
  },

  // BBOX estricto del territorio provincial
  TERRITORY_BOUNDS: {
    min_lon: -62.34245,
    min_lat: -26.87201,
    max_lon: -57.55426,
    max_lat: -22.47651,
  }
};
