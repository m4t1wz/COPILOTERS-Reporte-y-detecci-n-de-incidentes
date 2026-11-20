// Respuestas de prueba conformes a docs/tecnica/02. system-contracts.md (solo para tests).
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import type { LoginResponse } from '../types/auth';
import type { AdminReportItem } from '../types/report';

export const ADMIN_LOGIN: LoginResponse = {
  user: {
    id: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
    email: 'operador@formosa.gob.ar',
    full_name: 'Operador de Prueba',
    phone_number: null,
    role: 'admin',
  },
  session: { access_token: 'token-admin', refresh_token: 'refresh-admin', token_type: 'bearer', expires_in: 3600 },
};

export const REPORT_ITEM: AdminReportItem = {
  id: '9f8e7d6c-5b4a-3f2e-1d0c-ba9876543210',
  report_number: '#00142',
  category: 'calle_anegada',
  category_label: 'Calle anegada',
  created_at: '2026-11-18T14:22:10.000Z',
  location: { latitude: -26.1852, longitude: -58.1738, address_reference: 'Av. 25 de Mayo y Calle Fontana, Formosa Capital' },
  photo_url: null,
  citizen_comment: 'El agua supera la vereda.',
  current_status: 'pendiente',
  citizen: { id: 'c1', full_name: 'Juan Pérez', phone_number: '+543704000000' },
};

export const networkDown: AxiosAdapter = (config) =>
  Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));

export const respond =
  (data: unknown, status = 200): AxiosAdapter =>
  (config) =>
    Promise.resolve({ data, status, statusText: 'OK', headers: {}, config });

export const httpError =
  (status: number, data: unknown = null): AxiosAdapter =>
  (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, {
        status,
        statusText: '',
        headers: {},
        config,
        data,
      }),
    );
