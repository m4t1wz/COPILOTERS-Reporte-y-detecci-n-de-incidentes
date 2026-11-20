// Variables de entorno tipadas — docs/tecnica/04. admin-web.md §2 (core/env.ts)
// URL base por defecto: docs/tecnica/02. system-contracts.md §1.1

export const DEFAULT_API_URL = 'http://localhost:8000/api/v1';

export function resolveApiUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_API_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocolo');
    return value.replace(/\/+$/, '');
  } catch {
    console.warn(`VITE_API_URL inválida ("${value}"). Se usa ${DEFAULT_API_URL}.`);
    return DEFAULT_API_URL;
  }
}

export const env = {
  API_URL: resolveApiUrl(import.meta.env.VITE_API_URL),
} as const;
