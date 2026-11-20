jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import { QueryClient } from '@tanstack/react-query';
import { MAP_QUERY_KEYS, refreshMapQueries } from '../hooks/useIncidents';

describe('Refresco del mapa público', () => {
  it('invalida incidentes (con cualquier filtro) y zonas de concentración', async () => {
    const qc = new QueryClient();
    const keys = [['incidents', undefined], ['incidents', { category: 'calle_anegada' }], ['incident-clusters'], ['my-reports']];
    for (const k of keys) qc.setQueryData(k, {});
    await refreshMapQueries(qc);
    expect(qc.getQueryState(keys[0])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(keys[1])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(keys[2])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(keys[3])?.isInvalidated).toBe(false);
    qc.clear();
  });

  it('cubre exactamente las consultas del mapa', () => {
    expect(MAP_QUERY_KEYS).toEqual([['incidents'], ['incident-clusters']]);
  });
});
