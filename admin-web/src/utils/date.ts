// Formato de fechas — docs/tecnica/02. system-contracts.md §1.3
// Red: ISO 8601 UTC. Pantalla: hora oficial argentina (UTC-3), formato `DD/MM/AAAA (HH:MM)`.
import { DISPLAY_TIME_ZONE } from '../core/constants';

const formatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(iso: string): Record<string, string> | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const out: Record<string, string> = {};
  for (const p of formatter.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** `2026-11-18T14:22:10.000Z` → `18/11/2026 (11:22)` */
export function formatDateTime(iso: string): string {
  const p = parts(iso);
  if (!p) return '';
  return `${p.day}/${p.month}/${p.year} (${p.hour}:${p.minute})`;
}

/** `2026-11-18T14:22:10.000Z` → `18/11/2026` */
export function formatDate(iso: string): string {
  const p = parts(iso);
  if (!p) return '';
  return `${p.day}/${p.month}/${p.year}`;
}

/** Coordenadas exactas para mostrar entre paréntesis: `(-26.1852, -58.1738)`. */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `(${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de un `<input type="date">` (día argentino) → inicio del día en ISO UTC. */
export function dayStartToISO(day: string): string | undefined {
  if (!DAY_RE.test(day)) return undefined;
  return new Date(`${day}T00:00:00.000-03:00`).toISOString();
}

/** Fecha de un `<input type="date">` (día argentino) → fin del día en ISO UTC. */
export function dayEndToISO(day: string): string | undefined {
  if (!DAY_RE.test(day)) return undefined;
  return new Date(`${day}T23:59:59.999-03:00`).toISOString();
}
