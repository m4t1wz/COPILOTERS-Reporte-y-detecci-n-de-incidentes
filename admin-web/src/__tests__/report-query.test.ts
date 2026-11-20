import { describe, expect, it } from 'vitest';
import { parseReportsUrl, toApiFilters, toReportsUrl } from '../components/reports/report-query';

describe('URL de /reports', () => {
  it('parsea filtros válidos y descarta inválidos', () => {
    const s = parseReportsUrl(
      new URLSearchParams('status=pendiente&category=xx&start=2026-11-01&end=bad&search=%20rio%20&page=3&page_size=500'),
    );
    expect(s).toEqual({
      status: 'pendiente',
      category: undefined,
      start: '2026-11-01',
      end: undefined,
      search: 'rio',
      page: 3,
      pageSize: 100,
    });
  });

  it('valores por defecto', () => {
    const s = parseReportsUrl(new URLSearchParams(''));
    expect(s.page).toBe(1);
    expect(s.pageSize).toBe(20);
  });

  it('ida y vuelta omite valores por defecto', () => {
    const url = toReportsUrl({ category: 'calle_anegada', page: 1, pageSize: 20 });
    expect(url.toString()).toBe('category=calle_anegada');
  });

  it('convierte a parámetros del contrato', () => {
    const f = toApiFilters({ category: 'calle_anegada', start: '2026-11-01', end: '2026-11-18', page: 2, pageSize: 50 });
    expect(f).toEqual({
      status: undefined,
      category: 'calle_anegada',
      start_date: '2026-11-01T03:00:00.000Z',
      end_date: '2026-11-19T02:59:59.999Z',
      search: undefined,
      page: 2,
      page_size: 50,
    });
  });
});
