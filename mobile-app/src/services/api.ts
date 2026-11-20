import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { APIErrorResponse, User } from '../types';

const TOKEN_KEY = 'incidentes_formosa_access_token';
const REFRESH_TOKEN_KEY = 'incidentes_formosa_refresh_token';
const USER_KEY = 'incidentes_formosa_user';

// In-memory token cache for synchronous access in interceptors
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export const setStoredTokens = async (accessToken: string | null, refreshToken: string | null) => {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
  try {
    if (accessToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Entornos donde SecureStore no está disponible (ej. web/tests)
  }
};

/** Perfil del usuario autenticado, para restaurar la sesión al reabrir la app. */
export const setStoredUser = async (user: User | null) => {
  try {
    if (user) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch {
    // Entornos donde SecureStore no está disponible (ej. web/tests)
  }
};

export const getStoredUser = async (): Promise<User | null> => {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const getStoredAccessToken = async (): Promise<string | null> => {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    memoryAccessToken = token;
    return token;
  } catch {
    return memoryAccessToken;
  }
};

export const getStoredRefreshToken = async (): Promise<string | null> => {
  if (memoryRefreshToken) return memoryRefreshToken;
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    memoryRefreshToken = token;
    return token;
  } catch {
    return memoryRefreshToken;
  }
};

// URL Base de la API REST
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Request: inyectar token Bearer si existe
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getStoredAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag para evitar loops infinitos de renovación
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de Response: refrescar token automáticamente ante 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si es un error 401 y no es ya un intento de refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        await setStoredTokens(null, null);
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;
        await setStoredTokens(access_token, newRefreshToken || refreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        processQueue(null, access_token);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as AxiosError, null);
        await setStoredTokens(null, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Función auxiliar para parsear y normalizar errores HTTP según el estándar RFC 7807 documentado.
 */
export const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión a internet.';

export const formatAPIError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<APIErrorResponse>;
    if (axiosErr.response?.data?.error?.message) {
      return axiosErr.response.data.error.message;
    }
    // Sin respuesta HTTP (servidor apagado, sin internet o tiempo de espera agotado).
    if (!axiosErr.response) {
      return NETWORK_ERROR_MESSAGE;
    }
    if (axiosErr.response?.status === 404) {
      return 'El recurso solicitado no fue encontrado.';
    }
    if (axiosErr.response?.status === 500) {
      return 'Ocurrió un error en el servidor. Por favor intentá más tarde.';
    }
    return axiosErr.message || 'Ocurrió un error inesperado al comunicarse con el servidor.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error desconocido.';
};
