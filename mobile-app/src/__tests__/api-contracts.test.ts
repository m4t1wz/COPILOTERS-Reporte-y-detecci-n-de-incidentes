jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as fs from 'fs';
import * as path from 'path';
import { AxiosError } from 'axios';
import { apiClient, formatAPIError, NETWORK_ERROR_MESSAGE } from '../services/api';
import { authService } from '../services/auth-service';
import { incidentService } from '../services/incident-service';
import { reportService } from '../services/report-service';

const networkDown = (config: any) => Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));
const originalAdapter = apiClient.defaults.adapter;

describe('Sin conexión con el backend (sin datos de simulación)', () => {
  beforeEach(() => {
    apiClient.defaults.adapter = networkDown;
  });
  afterAll(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it.each([
    ['login', () => authService.login({ email: 'a@b.com', password: 'x' })],
    ['registro', () => authService.register({ email: 'a@b.com', password: 'x', full_name: 'A', phone_number: null } as any)],
    ['incidentes', () => incidentService.getIncidents()],
    ['zonas', () => incidentService.getClusters()],
    ['ficha pública', () => incidentService.getIncidentDetail('x')],
    ['envío de reporte', () => reportService.submitReport({ category: 'otro', latitude: -26.18, longitude: -58.17, comment: 'Prueba', photo: null })],
    ['mis reportes', () => reportService.getMyReports()],
    ['ficha propia', () => reportService.getMyReportDetail('x')],
  ])('%s rechaza y el mensaje indica falta de conexión', async (_name, call) => {
    const error = await (call as () => Promise<unknown>)().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AxiosError);
    expect(formatAPIError(error)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('el código fuente no contiene datos de simulación', () => {
    const services = path.join(__dirname, '..', 'services');
    expect(fs.existsSync(path.join(services, 'mock-data.ts'))).toBe(false);
    for (const file of fs.readdirSync(services)) {
      const code = fs.readFileSync(path.join(services, file), 'utf8');
      expect({ file, mock: /mock|Backend no alcanzable|demostraci/i.test(code) }).toEqual({ file, mock: false });
    }
  });
});

describe('Normalizador de Errores RFC 7807', () => {
  it('debe extraer el mensaje de un objeto RFC 7807', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'OUTSIDE_TERRITORY',
            message: 'La ubicación seleccionada se encuentra fuera del territorio provincial de Formosa.',
            timestamp: '2026-11-18T18:30:00Z',
          },
        },
      },
    };
    expect(formatAPIError(error)).toBe('La ubicación seleccionada se encuentra fuera del territorio provincial de Formosa.');
  });

  it('error de red o tiempo agotado: mensaje de falta de conexión', () => {
    expect(formatAPIError({ isAxiosError: true, message: 'Network Error', code: 'ERR_NETWORK' })).toBe(NETWORK_ERROR_MESSAGE);
    expect(formatAPIError({ isAxiosError: true, message: 'timeout of 10000ms exceeded', code: 'ECONNABORTED' })).toBe(NETWORK_ERROR_MESSAGE);
  });
});
