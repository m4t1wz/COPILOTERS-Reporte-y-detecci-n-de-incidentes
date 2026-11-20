import { MAP_CONFIG } from '../constants/map';

/**
 * Comprueba si las coordenadas dadas se encuentran dentro de los límites
 * de la caja envolvente (BBOX) de la provincia de Formosa.
 */
export const checkIsInsideFormosaBounds = (lat: number, lon: number): boolean => {
  const { min_lat, max_lat, min_lon, max_lon } = MAP_CONFIG.TERRITORY_BOUNDS;
  return lat >= min_lat && lat <= max_lat && lon >= min_lon && lon <= max_lon;
};
