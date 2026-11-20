// Ejecuta una llamada a la API y normaliza cualquier error a `ApiError` (RFC 7807).
// Sin conexión con el backend, el error es NETWORK_ERROR ("No se pudo conectar con el servidor."): no hay datos de simulación.
import { normalizeApiError } from '../core/api-client';

export async function apiRequest<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/** Elimina parámetros vacíos antes de enviarlos como query string. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
