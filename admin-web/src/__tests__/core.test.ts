import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  MAP_CENTER,
  MAP_INITIAL_ZOOM,
  MAP_MAX_BOUNDS,
  STATUS_KEYS,
  STATUS_LABELS,
  getAllowedTransitions,
  isFinalStatus,
  isTransitionAllowed,
} from '../core/constants';
import { DEFAULT_API_URL, resolveApiUrl } from '../core/env';
import { cn } from '../utils/cn';
import { dayEndToISO, dayStartToISO, formatCoordinates, formatDate, formatDateTime } from '../utils/date';

describe('env', () => {
  it('usa la URL por defecto si falta o es inválida', () => {
    expect(resolveApiUrl(undefined)).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl('   ')).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl('no-es-url')).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl('ftp://x.com')).toBe(DEFAULT_API_URL);
  });
  it('acepta URL válida y quita la barra final', () => {
    expect(resolveApiUrl('https://api.nexomap.formosa.gob.ar/api/v1/')).toBe(
      'https://api.nexomap.formosa.gob.ar/api/v1',
    );
  });
});

describe('constantes', () => {
  it('10 categorías con colores oficiales', () => {
    expect(CATEGORY_KEYS).toHaveLength(10);
    expect(CATEGORIES.calle_anegada).toEqual({ label: 'Calle anegada', color: '#2196F3' });
    expect(CATEGORIES.poste_cable_caido.color).toBe('#F9A825');
    expect(CATEGORIES.otro.color).toBe('#757575');
  });
  it('6 estados con etiquetas', () => {
    expect(STATUS_KEYS).toHaveLength(6);
    expect(STATUS_LABELS.en_revision).toBe('En revisión');
  });
  it('parámetros cartográficos exactos', () => {
    expect(MAP_CENTER).toEqual([-59.94836, -24.67426]);
    expect(MAP_INITIAL_ZOOM).toBe(7.5);
    expect(MAP_MAX_BOUNDS).toEqual([
      [-62.6, -27.1],
      [-57.3, -22.2],
    ]);
  });
});

describe('máquina de estados', () => {
  it('transiciones permitidas según el contrato', () => {
    expect(getAllowedTransitions('pendiente')).toEqual(['en_revision', 'descartado']);
    expect(getAllowedTransitions('en_revision')).toEqual(['verificado', 'descartado']);
    expect(getAllowedTransitions('verificado')).toEqual(['en_seguimiento', 'resuelto', 'descartado']);
    expect(getAllowedTransitions('en_seguimiento')).toEqual(['resuelto', 'descartado']);
  });
  it('rechaza transiciones no autorizadas', () => {
    expect(isTransitionAllowed('pendiente', 'resuelto')).toBe(false);
    expect(isTransitionAllowed('resuelto', 'pendiente')).toBe(false);
    expect(isTransitionAllowed('en_revision', 'verificado')).toBe(true);
  });
  it('estados finales', () => {
    expect(isFinalStatus('resuelto')).toBe(true);
    expect(isFinalStatus('descartado')).toBe(true);
    expect(isFinalStatus('verificado')).toBe(false);
  });
});

describe('formato de fechas (UTC-3)', () => {
  it('DD/MM/AAAA (HH:MM) en hora argentina', () => {
    expect(formatDateTime('2026-11-18T14:22:10.000Z')).toBe('18/11/2026 (11:22)');
    expect(formatDateTime('2026-11-18T02:05:00.000Z')).toBe('17/11/2026 (23:05)');
    expect(formatDate('2026-11-18T14:22:10.000Z')).toBe('18/11/2026');
  });
  it('fecha inválida devuelve cadena vacía', () => {
    expect(formatDateTime('x')).toBe('');
  });
  it('coordenadas a 4 decimales', () => {
    expect(formatCoordinates(-26.18523, -58.17381)).toBe('(-26.1852, -58.1738)');
  });
  it('días de filtro a rango ISO UTC', () => {
    expect(dayStartToISO('2026-11-01')).toBe('2026-11-01T03:00:00.000Z');
    expect(dayEndToISO('2026-11-18')).toBe('2026-11-19T02:59:59.999Z');
    expect(dayStartToISO('')).toBeUndefined();
  });
});

describe('cn', () => {
  it('resuelve conflictos de Tailwind', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4');
  });
});
