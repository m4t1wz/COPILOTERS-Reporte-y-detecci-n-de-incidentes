import { create } from 'zustand';
import { User, LoginPayload, RegisterPayload } from '../types';
import { authService } from '../services/auth-service';
import { getStoredAccessToken, getStoredUser } from '../services/api';
import { unregisterPushNotifications } from '../services/push-notifications';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (payload: LoginPayload) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(payload);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true });
    try {
      const response = await authService.register(payload);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // Quitar el token antes de borrar la sesión: el pedido necesita el token de acceso.
      await unregisterPushNotifications().catch(() => undefined);
      await authService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      const token = await getStoredAccessToken();
      const user = await getStoredUser();
      // Sin el perfil guardado (sesiones anteriores a esta versión) se pide iniciar sesión de nuevo.
      if (token && user) {
        set({ isAuthenticated: true, user, isLoading: false });
        return;
      }
    } catch {
      // Ignorar fallo al leer token
    }
    set({ isAuthenticated: false, user: null, isLoading: false });
  },
}));
