// Notificaciones push de cambio de estado (05 §7.4; backend: 03 §4.6).
// Es una notificación en la barra del celular: no usa SMS, número ni correo. El backend la envía vía
// Expo Push → Firebase Cloud Messaging cuando un operador cambia el estado de un reporte.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { apiClient } from './api';

/** Debe coincidir con ANDROID_CHANNEL_ID del backend (services/push_service.py). */
export const ANDROID_CHANNEL_ID = 'estado-reportes';

export class PushPermissionDeniedError extends Error {
  constructor() {
    super('No se concedieron permisos de notificación en el dispositivo.');
  }
}

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Estado de mis reportes',
    importance: Notifications.AndroidImportance.HIGH,
  });
};

const getExpoPushToken = async (): Promise<string> => {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') throw new PushPermissionDeniedError();
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
};

/** Pide permiso, obtiene el token del teléfono y lo registra en el backend (PUT /users/me/notifications). */
export const registerPushNotifications = async (): Promise<void> => {
  const pushToken = await getExpoPushToken();
  await apiClient.put('/users/me/notifications', { enabled: true, push_token: pushToken });
};

/** Quita el token del usuario en el backend. Se usa al desactivar el interruptor y al cerrar sesión. */
export const unregisterPushNotifications = async (): Promise<void> => {
  await apiClient.put('/users/me/notifications', { enabled: false, push_token: null });
};
