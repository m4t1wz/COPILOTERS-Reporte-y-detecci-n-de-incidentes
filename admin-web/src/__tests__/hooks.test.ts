import { QueryClient } from '@tanstack/react-query';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../core/api-client';
import { queryKeys } from '../hooks/query-keys';
import { loginAsAdmin } from '../hooks/use-auth';
import { fetchReportItem, findCachedReportItem, invalidateAfterStatusChange } from '../hooks/use-reports';
import { ADMIN_LOGIN, REPORT_ITEM, networkDown, respond } from './fixtures';

const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => {
  apiClient.defaults.adapter = networkDown;
});
afterAll(() => {
  apiClient.defaults.adapter = originalAdapter;
});

const page = (items: unknown[]) => ({
  items,
  pagination: { page: 1, page_size: 20, total_items: items.length, total_pages: 1, has_next: false, has_prev: false },
});

describe('loginAsAdmin', () => {
  it('acepta un administrador', async () => {
    apiClient.defaults.adapter = respond(ADMIN_LOGIN);
    const res = await loginAsAdmin({ email: 'operador@formosa.gob.ar', password: 'x' });
    expect(res.user.role).toBe('admin');
  });
  it('rechaza un ciudadano con 403', async () => {
    apiClient.defaults.adapter = respond({ ...ADMIN_LOGIN, user: { ...ADMIN_LOGIN.user, role: 'citizen' } });
    await expect(loginAsAdmin({ email: 'c@x.com', password: 'x' })).rejects.toMatchObject({
      code: 'FORBIDDEN_RESOURCE',
      status: 403,
    });
  });
  it('sin conexión informa el error de red', async () => {
    await expect(loginAsAdmin({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('ítem administrativo para la ficha (DOC-PENDIENTE-02)', () => {
  it('lo encuentra en la caché del listado', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.reportList({ page: 1 }), page([REPORT_ITEM]));
    expect(findCachedReportItem(qc, REPORT_ITEM.id)?.report_number).toBe('#00142');
  });
  it('sin caché lo busca por número de reporte en el backend', async () => {
    let search: unknown;
    apiClient.defaults.adapter = (config) => {
      search = config.params?.search;
      return respond(page([REPORT_ITEM]))(config);
    };
    const item = await fetchReportItem(new QueryClient(), REPORT_ITEM.id, '#00142');
    expect(search).toBe('#00142');
    expect(item?.citizen.full_name).toBe('Juan Pérez');
    expect(await fetchReportItem(new QueryClient(), 'no-existe', undefined)).toBeNull();
  });
});

describe('revalidación tras cambio de estado', () => {
  it('invalida reportes, incidentes y métricas', async () => {
    const qc = new QueryClient();
    const keys = [
      queryKeys.reportList({}),
      queryKeys.reportHistory('x'),
      queryKeys.incidentList({}),
      queryKeys.clusters(),
      queryKeys.dashboardStats(),
    ];
    for (const k of keys) qc.setQueryData(k, {});
    await invalidateAfterStatusChange(qc);
    for (const k of keys) expect(qc.getQueryState(k)?.isInvalidated, String(k)).toBe(true);
  });
});
