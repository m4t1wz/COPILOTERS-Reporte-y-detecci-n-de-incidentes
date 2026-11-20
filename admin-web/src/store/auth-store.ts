// Sesión del operador — docs/tecnica/04. admin-web.md §1, §2 (store/auth-store.ts), §3
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { configureAuthBridge } from '../core/api-client';
import type { LoginResponse, Session, User } from '../types/auth';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  /** `true` hasta terminar de hidratar la sesión persistida. */
  isLoading: boolean;
  setSession: (data: LoginResponse) => void;
  updateTokens: (session: Session) => void;
  logout: () => void;
}

export const AUTH_STORAGE_KEY = 'nexo-map-admin-session';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      setSession: ({ user, session }) => set({ user, session, isAuthenticated: true }),
      updateTokens: (session) => set({ session }),
      logout: () => set({ user: null, session: null, isAuthenticated: false }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user, session, isAuthenticated }) => ({ user, session, isAuthenticated }),
    },
  ),
);

function finishHydration(): void {
  useAuthStore.setState({ isLoading: false });
}

// Sin `localStorage` (p. ej. entorno de tests) el middleware no adjunta la API `persist`.
const persistApi = (useAuthStore as Partial<typeof useAuthStore>).persist;
if (!persistApi || persistApi.hasHydrated()) finishHydration();
else persistApi.onFinishHydration(finishHydration);

configureAuthBridge({
  getAccessToken: () => useAuthStore.getState().session?.access_token ?? null,
  getRefreshToken: () => useAuthStore.getState().session?.refresh_token ?? null,
  onTokensRefreshed: (session) => useAuthStore.getState().updateTokens(session),
  onAuthFailure: () => useAuthStore.getState().logout(),
});
