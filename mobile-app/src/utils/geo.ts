import formosaMask from '../../assets/geo/formosa-mask.json';

type Ring = number[][]; // [longitud, latitud]

// El hueco de la máscara invertida es el polígono oficial de Formosa: los mismos 11.673 vértices que
// backend/data/formosa.json, con el que el backend valida cada reporte (03 §4.1).
const extractFormosaRing = (): Ring => {
  const data = formosaMask as any;
  const geometry = data.type === 'FeatureCollection' ? data.features[0].geometry : data.geometry ?? data;
  return geometry.coordinates[1] as Ring;
};

const FORMOSA_RING = extractFormosaRing();

const RING_BOUNDS = FORMOSA_RING.reduce(
  (b, [lon, lat]) => ({
    minLon: Math.min(b.minLon, lon),
    maxLon: Math.max(b.maxLon, lon),
    minLat: Math.min(b.minLat, lat),
    maxLat: Math.max(b.maxLat, lat),
  }),
  { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
);

/** Ray casting: cantidad impar de cruces con el borde = punto dentro del polígono. */
export const isPointInRing = (lon: number, lat: number, ring: Ring): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Indica si las coordenadas están dentro del polígono real de la provincia de Formosa (no de un rectángulo):
 * un punto en Chaco, Corrientes o Paraguay se rechaza aunque esté pegado al límite.
 */
export const isInsideFormosa = (lat: number, lon: number): boolean => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lon < RING_BOUNDS.minLon || lon > RING_BOUNDS.maxLon || lat < RING_BOUNDS.minLat || lat > RING_BOUNDS.maxLat) {
    return false;
  }
  return isPointInRing(lon, lat, FORMOSA_RING);
};
