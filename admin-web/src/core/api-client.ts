// Cliente HTTP — docs/tecnica/04. admin-web.md §1, §2 (core/api-client.ts)
// Bearer: 02. system-contracts.md §3.1 · Refresh: POST /auth/refresh · Errores: RFC 7807 (§1.4)
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { RefreshResponse, Session } from '../types/auth';
import type { APIErrorBody, APIErrorResponse } from '../types/common';
import { env } from './env';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Marca interna: la petición ya fue reintentada tras renovar el token. */
    _retry?: boolean;
    /** No intentar renovar el token ante un 401 (login y refresh). */
    skipAuthRefresh?: boolean;
  }
}

/** Error normalizado con la forma RFC 7807 del contrato. */
export class ApiError extends Error implements APIErrorBody {
  readonly code: string;
  readonly details: Record<string, unknown> | null;
  readonly timestamp: string;
  readonly status: number | null;

  constructor(body: APIErrorBody, status: number | null) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.details = body.details;
    this.timestamp = body.timestamp;
    this.status = status;
  }
}

/** Puente con el estado de sesión (lo registra el auth-store, evitando dependencias circulares). */
export interface AuthBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (session: Session) => void;
  onAuthFailure: () => void;
}

let authBridge: AuthBridge | null = null;

export function configureAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = authBridge?.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = authBridge?.getRefreshToken();
  if (!refreshToken) throw new Error('Sin refresh token');
  const { data } = await apiClient.post<RefreshResponse>(
    '/auth/refresh',
    { refresh_token: refreshToken },
    { skipAuthRefresh: true },
  );
  authBridge?.onTokensRefreshed(data);
  return data.access_token;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) throw error;
    const config = error.config as InternalAxiosRequestConfig;

    if (error.response?.status !== 401 || config._retry || config.skipAuthRefresh || !authBridge) {
      throw error;
    }

    config._retry = true;
    try {
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const token = await refreshInFlight;
      config.headers.set('Authorization', `Bearer ${token}`);
      return apiClient.request(config);
    } catch {
      authBridge?.onAuthFailure();
      throw error;
    }
  },
);

/** Backend no alcanzable: sin respuesta HTTP (ECONNREFUSED / Network Error / timeout). */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === 'NETWORK_ERROR';
  if (!axios.isAxiosError(error)) return false;
  if (error.code === AxiosError.ERR_CANCELED) return false;
  return !error.response;
}

function isApiErrorResponse(data: unknown): data is APIErrorResponse {
  if (typeof data !== 'object' || data === null) return false;
  const body = (data as { error?: unknown }).error;
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as APIErrorBody).code === 'string' &&
    typeof (body as APIErrorBody).message === 'string'
  );
}

/** Códigos por estado HTTP — 01. architecture.md §7 (tabla de códigos de error). */
const STATUS_CODES: Record<number, { code: string; message: string }> = {
  400: { code: 'INVALID_INPUT', message: 'Parámetros inválidos.' },
  401: { code: 'AUTH_REQUIRED', message: 'Sesión no válida o expirada.' },
  403: { code: 'FORBIDDEN_RESOURCE', message: 'Acceso restringido a operadores administrativos.' },
  404: { code: 'REPORT_NOT_FOUND', message: 'El reporte no existe.' },
  409: { code: 'INVALID_STATE_TRANSITION', message: 'Transición de estado no permitida.' },
  422: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.' },
  429: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes. Intente nuevamente en un minuto.' },
  500: { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno del servidor.' },
};

/** Convierte cualquier error en `ApiError` con la estructura RFC 7807. */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const timestamp = new Date().toISOString();

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(
        { code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.', details: null, timestamp },
        null,
      );
    }
    const { status, data } = error.response;
    if (isApiErrorResponse(data)) {
      return new ApiError(
        {
          code: data.error.code,
          message: data.error.message,
          details: data.error.details ?? null,
          timestamp: data.error.timestamp ?? timestamp,
        },
        status,
      );
    }
    const fallback = STATUS_CODES[status] ?? STATUS_CODES[status >= 500 ? 500 : 400];
    return new ApiError({ ...fallback, details: null, timestamp }, status);
  }

  const message = error instanceof Error ? error.message : 'Error inesperado.';
  return new ApiError({ code: 'INTERNAL_SERVER_ERROR', message, details: null, timestamp }, null);
}
