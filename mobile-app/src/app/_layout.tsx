import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/auth-store';
import { useSettingsStore } from '../store/settings-store';
import { registerPushNotifications } from '../services/push-notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Notificaciones de cambio de estado (DEP-00): con la app abierta también se muestran en la barra.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const reportIdOf = (notification: Notifications.Notification): string | null => {
  const data = notification.request.content.data as { type?: string; report_id?: string } | undefined;
  return data?.type === 'report_status' && data.report_id ? data.report_id : null;
};

// React Native no tiene eventos de foco de ventana: se informa a React Query cuando la app vuelve a
// primer plano, para que las consultas con refetchOnWindowFocus (mapa) se actualicen.
focusManager.setEventListener((handleFocus) => {
  if (Platform.OS === 'web') return undefined;
  const subscription = AppState.addEventListener('change', (status) => handleFocus(status === 'active'));
  return () => subscription.remove();
});

function RootNavigationLayout() {
  const { isDark } = useAppTheme();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Registro del teléfono para notificaciones: al iniciar sesión, al registrarse y también al abrir la app con
  // la sesión restaurada (la preferencia queda guardada en el dispositivo aunque no se toque el interruptor).
  // Una vez por usuario y apertura de la app; también renueva el token si Firebase lo cambió.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const settingsLoaded = useSettingsStore((s) => s.isLoaded);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const registeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !userId || !settingsLoaded || !notificationsEnabled) {
      if (!isAuthenticated) registeredFor.current = null;
      return;
    }
    if (registeredFor.current === userId) return;
    registeredFor.current = userId;
    registerPushNotifications().catch((error) => {
      registeredFor.current = null;
      console.warn('[Notificaciones] No se pudo registrar el teléfono:', error?.message ?? error);
    });
  }, [isAuthenticated, userId, settingsLoaded, notificationsEnabled]);

  const router = useRouter();
  const navigationState = useRootNavigationState();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);

  // Llega un aviso con la app abierta: se refrescan «Mis reportes», la ficha y el mapa.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const reportId = reportIdOf(notification);
      if (!reportId) return;
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
      queryClient.invalidateQueries({ queryKey: ['my-report-detail', reportId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });
    return () => subscription.remove();
  }, []);

  // Tocar la notificación (también con la app cerrada) abre la ficha del reporte.
  useEffect(() => {
    if (!lastResponse || !navigationState?.key) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const responseId = lastResponse.notification.request.identifier;
    const reportId = reportIdOf(lastResponse.notification);
    if (!reportId || handledResponse.current === responseId) return;
    handledResponse.current = responseId;
    router.push(`/my-reports/${reportId}`);
  }, [lastResponse, navigationState?.key, router]);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="report/new" />
        <Stack.Screen
          name="report/location-picker"
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="report/confirmation" />
        <Stack.Screen name="my-reports" />
        <Stack.Screen
          name="incident/[id]"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigationLayout />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
