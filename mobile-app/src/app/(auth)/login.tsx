import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { PressableSurface } from '../../components/common/PressableSurface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, LogIn } from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/auth-store';
import { formatAPIError } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { colors, radius } = useAppTheme();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresá tu correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor ingresá tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: cleanEmail, password });
      if (returnTo) {
        router.replace(returnTo as any);
      } else {
        router.replace('/');
      }
    } catch (error) {
      setErrorMessage(formatAPIError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToMap = () => {
    router.replace('/');
  };

  const handleGoToRegister = () => {
    router.push({
      pathname: '/(auth)/register',
      params: { returnTo },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Botón Volver al Mapa */}
          <PressableSurface
            style={styles.backButton}
            onPress={handleBackToMap}
            accessibilityRole="button"
            accessibilityLabel="Volver al mapa"
          >
            <ArrowLeft size={20} color={colors.textMain} strokeWidth={2} />
            <AccessibleText variant="label" weight="medium" style={styles.backButtonText}>
              Explorar el mapa
            </AccessibleText>
          </PressableSurface>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.brandHeader}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <AccessibleText variant="heading2" weight="bold" style={[styles.brandName, { color: colors.primary }]}>
                NEXO MAP
              </AccessibleText>
            </View>

            <AccessibleText variant="heading2" weight="semibold" style={styles.title}>
              Iniciar sesión
            </AccessibleText>
            <AccessibleText variant="body" muted style={styles.subtitle}>
              Ingresá para registrar o consultar tus reportes.
            </AccessibleText>

            <ErrorBanner message={errorMessage} />

            {/* Campo Email */}
            <View style={styles.inputGroup}>
              <AccessibleText variant="label" weight="medium" style={styles.inputLabel}>
                Correo electrónico
              </AccessibleText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.field,
                    color: colors.textMain,
                  },
                ]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Campo Contraseña */}
            <View style={styles.inputGroup}>
              <AccessibleText variant="label" weight="medium" style={styles.inputLabel}>
                Contraseña
              </AccessibleText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.field,
                    color: colors.textMain,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Botón de Enviar */}
            <PrimaryButton
              title="Iniciar sesión"
              onPress={handleLogin}
              loading={isSubmitting}
              icon={<LogIn size={18} color={colors.onPrimary} strokeWidth={2} />}
              style={styles.submitButton}
            />

            {/* Enlace de Registro según Requerimiento Funcional */}
            <PressableSurface
              onPress={handleGoToRegister}
              style={styles.registerLinkContainer}
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta nueva"
            >
              <AccessibleText variant="body" style={styles.registerText}>
                ¿Nuevo por acá?{' '}
                <AccessibleText weight="semibold" style={{ color: colors.primary }}>
                  Tocá acá para registrarte.
                </AccessibleText>
              </AccessibleText>
            </PressableSurface>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    marginLeft: 8,
  },
  card: {
    borderWidth: 1,
    padding: 24,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  brandLogo: {
    width: 64,
    height: 64,
  },
  brandName: {
    letterSpacing: 1.2,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  registerLinkContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  registerText: {
    textAlign: 'center',
  },
});
