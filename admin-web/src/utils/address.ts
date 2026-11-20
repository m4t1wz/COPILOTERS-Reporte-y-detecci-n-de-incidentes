// Referencia de dirección: la calcula el backend (03 §4.2). Si la geocodificación falla, guarda una
// referencia sintética con coordenadas; la documentación usa dos formatos (DOC-PENDIENTE-09):
// "Coordenadas: [lat, lon], Formosa" (01) y "Ubicación Formosa (lat, lon)" (03 §4.2).
import { formatCoordinates } from './date';

const SYNTHETIC_RE = /^\s*(coordenadas\b|ubicaci[oó]n formosa\s*\()/i;

export interface AddressDisplay {
  /** Texto principal: la referencia del backend o, si falta, las coordenadas. */
  label: string;
  /** Si conviene mostrar las coordenadas aparte (no cuando el texto principal ya las contiene). */
  showCoordinates: boolean;
}

export function addressDisplay(address: string | null | undefined, latitude: number, longitude: number): AddressDisplay {
  const text = (address ?? '').trim();
  if (!text) return { label: formatCoordinates(latitude, longitude), showCoordinates: false };
  return { label: text, showCoordinates: !SYNTHETIC_RE.test(text) };
}
