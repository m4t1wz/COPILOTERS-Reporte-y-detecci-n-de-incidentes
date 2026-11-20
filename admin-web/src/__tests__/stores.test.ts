import type { AxiosAdapter } from 'axios';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../core/api-client';
import { ADMIN_LOGIN } from './fixtures';
import { useAuthStore } from '../store/auth-store';
import { useUIStore } from '../store/ui-store';

const originalAdapter = apiClient.defaults.adapter;
afterAll(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('auth-store', () => {
  beforeEach(() => useAuthStore.getState().logout());

  it('termina la hidratación sin sesión', () => {
    const s = useAuthStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
  });

  it('setSession y logout', () => {
    useAuthStore.getState().setSession(ADMIN_LOGIN);
    let s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.id).toBe(ADMIN_LOGIN.user.id);
    expect(s.session?.access_token).toBe('token-admin');

    s.logout();
    s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.session).toBeNull();
  });

  it('el cliente HTTP usa el token de la sesión', async () => {
    useAuthStore.getState().setSession(ADMIN_LOGIN);
    const adapter: AxiosAdapter = (config) =>
      Promise.resolve({
        data: config.headers.Authorization,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    apiClient.defaults.adapter = adapter;
    const { data } = await apiClient.get('/admin/dashboard/stats');
    expect(data).toBe('Bearer token-admin');
  });

  it('updateTokens reemplaza solo la sesión', () => {
    useAuthStore.getState().setSession(ADMIN_LOGIN);
    useAuthStore.getState().updateTokens({
      access_token: 'nuevo',
      refresh_token: 'r2',
      token_type: 'bearer',
      expires_in: 3600,
    });
    const s = useAuthStore.getState();
    expect(s.session?.access_token).toBe('nuevo');
    expect(s.user?.id).toBe(ADMIN_LOGIN.user.id);
  });
});

describe('ui-store', () => {
  it('alterna la barra lateral y combina filtros', () => {
    const ui = useUIStore.getState();
    expect(ui.sidebarCollapsed).toBe(false);
    ui.toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    ui.setMapFilters({ category: 'calle_anegada' });
    ui.setMapFilters({ status: 'verificado' });
    expect(useUIStore.getState().mapFilters).toEqual({ category: 'calle_anegada', status: 'verificado' });
    ui.resetMapFilters();
    expect(useUIStore.getState().mapFilters).toEqual({});
  });
});
