import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  configureAuthBridge,
  isNetworkError,
  normalizeApiError,
} from '../core/api-client';

function response(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const res = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    throw new AxiosError('HTTP ' + status, AxiosError.ERR_BAD_RESPONSE, config, null, res);
  }
  return Promise.resolve(res);
}

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  configureAuthBridge(null);
});

describe('interceptor de autenticación', () => {
  it('inyecta Authorization Bearer', async () => {
    configureAuthBridge({
      getAccessToken: () => 'tok-1',
      getRefreshToken: () => null,
      onTokensRefreshed: () => {},
      onAuthFailure: () => {},
    });
    const adapter: AxiosAdapter = (config) => response(config, 200, { auth: config.headers.Authorization });
    apiClient.defaults.adapter = adapter;
    const { data } = await apiClient.get('/admin/dashboard/stats');
    expect(data.auth).toBe('Bearer tok-1');
  });

  it('ante 401 renueva el token una vez y reintenta', async () => {
    let access = 'expirado';
    const onTokensRefreshed = vi.fn((s: { access_token: string }) => {
      access = s.access_token;
    });
    configureAuthBridge({
      getAccessToken: () => access,
      getRefreshToken: () => 'refresh-1',
      onTokensRefreshed,
      onAuthFailure: vi.fn(),
    });
    const adapter: AxiosAdapter = (config) => {
      if (config.url === '/auth/refresh') {
        return response(config, 200, {
          access_token: 'nuevo',
          refresh_token: 'refresh-2',
          token_type: 'bearer',
          expires_in: 3600,
        });
      }
      const auth = AxiosHeaders.from(config.headers).get('Authorization');
      return auth === 'Bearer nuevo' ? response(config, 200, { ok: true }) : response(config, 401, {});
    };
    apiClient.defaults.adapter = adapter;
    const { data } = await apiClient.get('/admin/reports');
    expect(data.ok).toBe(true);
    expect(onTokensRefreshed).toHaveBeenCalledOnce();
  });

  it('si la renovación falla, cierra la sesión', async () => {
    const onAuthFailure = vi.fn();
    configureAuthBridge({
      getAccessToken: () => 'expirado',
      getRefreshToken: () => 'refresh-1',
      onTokensRefreshed: vi.fn(),
      onAuthFailure,
    });
    apiClient.defaults.adapter = (config) => response(config, 401, {});
    await expect(apiClient.get('/admin/reports')).rejects.toBeInstanceOf(AxiosError);
    expect(onAuthFailure).toHaveBeenCalledOnce();
  });
});

describe('normalización RFC 7807', () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

  it('respeta el cuerpo de error del contrato', () => {
    const err = new AxiosError('x', 'ERR_BAD_REQUEST', config, null, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
      data: {
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Transición no permitida.',
          details: { from: 'pendiente' },
          timestamp: '2026-11-18T18:30:00.000Z',
        },
      },
    });
    const n = normalizeApiError(err);
    expect(n).toBeInstanceOf(ApiError);
    expect(n.code).toBe('INVALID_STATE_TRANSITION');
    expect(n.message).toBe('Transición no permitida.');
    expect(n.details).toEqual({ from: 'pendiente' });
    expect(n.status).toBe(409);
  });

  it('sin cuerpo usa el código por estado HTTP', () => {
    const err = new AxiosError('x', 'ERR_BAD_RESPONSE', config, null, {
      status: 503,
      statusText: '',
      headers: {},
      config,
      data: '',
    });
    expect(normalizeApiError(err).code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('error de red', () => {
    const err = new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    expect(isNetworkError(err)).toBe(true);
    expect(normalizeApiError(err).code).toBe('NETWORK_ERROR');
  });

  it('respuestas HTTP y cancelaciones no son error de red', () => {
    const http = new AxiosError('x', 'ERR_BAD_RESPONSE', config, null, {
      status: 500,
      statusText: '',
      headers: {},
      config,
      data: null,
    });
    expect(isNetworkError(http)).toBe(false);
    expect(isNetworkError(new axios.CanceledError())).toBe(false);
    expect(isNetworkError(new Error('x'))).toBe(false);
  });
});
