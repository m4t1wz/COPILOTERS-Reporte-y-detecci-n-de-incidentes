import { apiClient, setStoredTokens, setStoredUser } from './api';
import {
  AuthResponse,
  LoginPayload,
  RefreshTokenResponse,
  RegisterPayload,
} from '../types';

const persistSession = async (data: AuthResponse) => {
  await setStoredTokens(data.session.access_token, data.session.refresh_token);
  await setStoredUser(data.user);
};

export const authService = {
  /**
   * Inicio de sesión de ciudadano
   * POST /api/v1/auth/login
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    await persistSession(response.data);
    return response.data;
  },

  /**
   * Registro de nuevo ciudadano
   * POST /api/v1/auth/register
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    await persistSession(response.data);
    return response.data;
  },

  /**
   * Renovación de token de sesión
   * POST /api/v1/auth/refresh
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Cerrar sesión y limpiar tokens y perfil locales
   */
  async logout(): Promise<void> {
    await setStoredTokens(null, null);
    await setStoredUser(null);
  },
};
