import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { PressableSurface } from '../components/common/PressableSurface';
import { useRouter } from 'expo-router';
import {
  PushPermissionDeniedError,
  registerPushNotifications,
  unregisterPushNotifications,
} from '../services/push-notifications';
import { formatAPIError } from '../services/api';
import {
  ArrowLeft,
  Type,
  Moon,
  Bell,
  LogOut,
  Check,
} from 'lucide-react-native';
import { AccessibleText } from '../components/common/AccessibleText';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { useAppTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/auth-store';
import { FontSizePreference, ThemePreference } from '../constants/typography';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    fontSize,
    fontScale,
    themePreference,
    notificationsEnabled,
    colors,
    radius,
    setFontSize,
    setThemePreference,
    setNotificationsEnabled,
  } = useAppTheme();

  const { isAuthenticated, user, logout } = useAuthStore();

  const handleBack = () => {
    router.back();
  };

  // Con sesión iniciada, el teléfono se registra en el backend; sin sesión, la preferencia se guarda y el
  // registro se hace al iniciar sesión (auth-store).
  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      try {
        if (isAuthenticated) await registerPushNotifications();
        await setNotificationsEnabled(true);
      } catch (error) {
        console.warn('[Notificaciones] No se pudo activar:', (error as Error)?.message ?? error);
        await setNotificationsEnabled(false);
        Alert.alert(
          'Notificaciones',
          error instanceof PushPermissionDeniedError ? error.message : formatAPIError(error)
        );
      }
    } else {
      await setNotificationsEnabled(false);
      if (isAuthenticated) unregisterPushNotifications().catch(() => undefined);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const fontOptions: Array<{ key: FontSizePreference; label: string; scale: string }> = [
    { key: 'normal', label: 'Normal', scale: '100%' },
    { key: 'large', label: 'Grande', scale: '125%' },
    { key: 'xlarge', label: 'Extra Grande', scale: '150%' },
  ];

  const themeOptions: Array<{ key: ThemePreference; label: string }> = [
    { key: 'system', label: 'Automático (del sistema)' },
    { key: 'light', label: 'Tema Claro' },
    { key: 'dark', label: 'Tema Oscuro' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <PressableSurface
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver al mapa"
        >
          <ArrowLeft size={22} color={colors.textMain} strokeWidth={2} />
        </PressableSurface>
        <AccessibleText variant="heading2" weight="semibold">
          Configuración
        </AccessibleText>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Ajuste de Tamaño de Fuente */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.sectionHeader}>
            <Type size={20} color={colors.primary} strokeWidth={2} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Tamaño de fuente
            </AccessibleText>
          </View>
          <AccessibleText variant="small" muted style={styles.sectionSubtitle}>
            Ajustá el tamaño del texto para una lectura más cómoda en toda la aplicación.
          </AccessibleText>

          <View style={styles.optionsList}>
            {fontOptions.map((opt) => {
              const isSelected = fontSize === opt.key;
              return (
                <PressableSurface
                  key={opt.key}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                      borderRadius: radius.button,
                    },
                  ]}
                  onPress={() => setFontSize(opt.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.optionTextContainer}>
                    <AccessibleText variant="body" weight={isSelected ? 'semibold' : 'regular'}>
                      {opt.label}
                    </AccessibleText>
                    <AccessibleText variant="small" muted>
                      Escala {opt.scale}
                    </AccessibleText>
                  </View>
                  {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                </PressableSurface>
              );
            })}
          </View>

          {/* Caja de previsualización */}
          <View style={[styles.previewBox, { backgroundColor: colors.background, borderRadius: radius.field }]}>
            <AccessibleText variant="small" muted weight="medium">
              Texto de ejemplo:
            </AccessibleText>
            <AccessibleText variant="body" weight="medium" style={{ marginTop: 4 }}>
              Así se verán las alertas y reportes en la aplicación móvil de Formosa.
            </AccessibleText>
          </View>
        </View>

        {/* 2. Tema Visual (Claro / Oscuro) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.sectionHeader}>
            <Moon size={20} color={colors.primary} strokeWidth={2} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Tema y apariencia
            </AccessibleText>
          </View>
          <AccessibleText variant="small" muted style={styles.sectionSubtitle}>
            Elegí entre contraste diurno o nocturno para la interfaz y el mapa.
          </AccessibleText>

          <View style={styles.optionsList}>
            {themeOptions.map((opt) => {
              const isSelected = themePreference === opt.key;
              return (
                <PressableSurface
                  key={opt.key}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                      borderRadius: radius.button,
                    },
                  ]}
                  onPress={() => setThemePreference(opt.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <AccessibleText variant="body" weight={isSelected ? 'semibold' : 'regular'}>
                    {opt.label}
                  </AccessibleText>
                  {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                </PressableSurface>
              );
            })}
          </View>
        </View>

        {/* 3. Notificaciones */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={colors.primary} strokeWidth={2} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Notificaciones de reportes
            </AccessibleText>
          </View>
          <AccessibleText variant="small" muted style={styles.sectionSubtitle}>
            Recibir avisos cuando el personal de emergencia actualice el estado de tus avisos.
          </AccessibleText>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <AccessibleText variant="body" weight="medium">
                Notificaciones activas
              </AccessibleText>
              <AccessibleText variant="small" muted>
                Inicia desactivado por defecto
              </AccessibleText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* 4. Sesión de Usuario */}
        {isAuthenticated && user && (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            <AccessibleText variant="heading3" weight="semibold" style={{ marginBottom: 4 }}>
              Cuenta de usuario
            </AccessibleText>
            <AccessibleText variant="body" weight="medium">
              {user.full_name}
            </AccessibleText>
            <AccessibleText variant="small" muted style={{ marginBottom: 16 }}>
              {user.email}
            </AccessibleText>

            <PrimaryButton
              title="Cerrar sesión"
              variant="outline"
              onPress={handleLogout}
              icon={<LogOut size={18} color={colors.primary} strokeWidth={2} />}
            />
          </View>
        )}

        {/* Footer Informativo de Marca NEXO MAP */}
        <View style={styles.appInfoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.settingsLogo}
            resizeMode="contain"
          />
          <AccessibleText variant="label" weight="semibold" style={[styles.appName, { color: colors.textMain }]}>
            NEXO MAP
          </AccessibleText>
          <AccessibleText variant="small" muted>
            Sistema de Reporte y Seguimiento Territorial (Formosa) • v1.0.0
          </AccessibleText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    marginLeft: 8,
  },
  sectionSubtitle: {
    marginBottom: 14,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 52, // Accesible
  },
  optionTextContainer: {
    gap: 2,
  },
  previewBox: {
    marginTop: 14,
    padding: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    paddingRight: 16,
  },
  appInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  settingsLogo: {
    width: 52,
    height: 52,
    marginBottom: 6,
  },
  appName: {
    letterSpacing: 1,
  },
});
