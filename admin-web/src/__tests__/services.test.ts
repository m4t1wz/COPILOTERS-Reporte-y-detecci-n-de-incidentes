// Sin datos de simulación: sin conexión, todo servicio rechaza con NETWORK_ERROR.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../core/api-client';
import { adminService } from '../services/admin-service';
import { authService } from '../services/auth-service';
import { incidentService } from '../services/incident-service';
import { maintenanceService } from '../services/maintenance-service';
import { cleanParams } from '../services/request';
import { ADMIN_LOGIN, httpError, networkDown, respond } from './fixtures';

const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => {
  apiClient.defaults.adapter = networkDown;
});
afterAll(() => {
  apiClient.defaults.adapter = originalAdapter;
});

const NETWORK = { code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.', status: null };

describe('sin conexión con el backend', () => {
  it.each([
    ['login', () => authService.login({ email: 'a@b.com', password: 'x' })],
    ['incidentes', () => incidentService.getIncidents()],
    ['zonas', () => incidentService.getClusters()],
    ['ficha pública', () => incidentService.getIncidentDetail('x')],
    ['métricas', () => adminService.getDashboardStats()],
    ['listado', () => adminService.getReports({ page: 1 })],
    ['historial', () => adminService.getReportHistory('x')],
    ['cambio de estado', () => adminService.updateReportStatus('x', { new_status: 'en_revision', admin_comment: 'Comentario', notify_citizen: true })],
  ])('%s rechaza con NETWORK_ERROR (sin simulación)', async (_name, call) => {
    await expect(call()).rejects.toMatchObject(NETWORK);
  });
});

describe('con backend disponible', () => {
  it('login devuelve la respuesta real', async () => {
    apiClient.defaults.adapter = respond(ADMIN_LOGIN);
    await expect(authService.login({ email: ' operador@formosa.gob.ar ', password: 'x' })).resolves.toEqual(ADMIN_LOGIN);
  });
  it('usa la respuesta real de métricas', async () => {
    apiClient.defaults.adapter = respond({ real: true });
    await expect(adminService.getDashboardStats()).resolves.toEqual({ real: true });
  });
  it('propaga errores HTTP con la estructura RFC 7807', async () => {
    apiClient.defaults.adapter = httpError(401, {
      error: { code: 'AUTH_REQUIRED', message: 'Credenciales inválidas.', details: null, timestamp: '2026-11-20T00:00:00.000Z' },
    });
    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      message: 'Credenciales inválidas.',
      status: 401,
    });
  });
  it('un 500 sin cuerpo se normaliza', async () => {
    apiClient.defaults.adapter = httpError(500);
    await expect(adminService.getReports()).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR', status: 500 });
  });
});

describe('cleanParams', () => {
  it('quita parámetros vacíos', () => {
    expect(cleanParams({ a: 1, b: '', c: undefined, d: null, e: 'x' })).toEqual({ a: 1, e: 'x' });
  });
});

describe('mantenimiento (borrado de datos de prueba)', () => {
  it('envía el alcance y la confirmación', async () => {
    let body: unknown;
    apiClient.defaults.adapter = (config) => {
      body = JSON.parse(config.data);
      return respond({ scope: 'reportes', deleted: { reportes: 1, historial: 2, agrupaciones: 0, fotos: 0, cuentas: 0 } })(config);
    };
    const res = await maintenanceService.reset('reportes', 'BORRAR');
    expect(body).toEqual({ scope: 'reportes', confirmation: 'BORRAR' });
    expect(res.deleted.reportes).toBe(1);
  });
  it('deshabilitada en el servidor: 404', async () => {
    apiClient.defaults.adapter = httpError(404);
    await expect(maintenanceService.reset('todo', 'BORRAR')).rejects.toMatchObject({ status: 404 });
  });
});
