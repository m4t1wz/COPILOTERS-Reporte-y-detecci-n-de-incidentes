jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'proj-123' } } } } }));
const mockNotifications = {
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[telefono]' }),
};
jest.mock('expo-notifications', () => mockNotifications);

import { apiClient } from '../services/api';
import {
  ANDROID_CHANNEL_ID,
  PushPermissionDeniedError,
  registerPushNotifications,
  unregisterPushNotifications,
} from '../services/push-notifications';

describe('Notificaciones push (DEP-00)', () => {
  let put: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    put = jest.spyOn(apiClient, 'put').mockResolvedValue({ data: { enabled: true, has_token: true } } as any);
  });
  afterEach(() => put.mockRestore());

  it('registra el token del teléfono en el backend', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    await registerPushNotifications();
    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(ANDROID_CHANNEL_ID, expect.any(Object));
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-123' });
    expect(put).toHaveBeenCalledWith('/users/me/notifications', { enabled: true, push_token: 'ExponentPushToken[telefono]' });
  });

  it('pide el permiso si no estaba concedido y falla si se niega', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await expect(registerPushNotifications()).rejects.toBeInstanceOf(PushPermissionDeniedError);
    expect(put).not.toHaveBeenCalled();
  });

  it('al desactivar quita el token', async () => {
    await unregisterPushNotifications();
    expect(put).toHaveBeenCalledWith('/users/me/notifications', { enabled: false, push_token: null });
  });

  it('el canal coincide con el que usa el backend', () => {
    expect(ANDROID_CHANNEL_ID).toBe('estado-reportes');
  });
});
