import { describe, expect, it, vi } from 'vitest';

describe('auth-store con localStorage', () => {
  it('hidrata la sesión persistida y vuelve a persistir al cerrar sesión', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
    data.set(
      'nexo-map-admin-session',
      JSON.stringify({
        state: {
          user: { id: 'u1', email: 'a@b.c', full_name: 'Operador', phone_number: null, role: 'admin' },
          session: { access_token: 't', refresh_token: 'r', token_type: 'bearer', expires_in: 3600 },
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
    vi.resetModules();
    const { useAuthStore } = await import('../store/auth-store');
    const s = useAuthStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.full_name).toBe('Operador');

    s.logout();
    const stored = JSON.parse(data.get('nexo-map-admin-session')!);
    expect(stored.state.isAuthenticated).toBe(false);
    expect(stored.state).not.toHaveProperty('isLoading');
    vi.unstubAllGlobals();
  });
});
