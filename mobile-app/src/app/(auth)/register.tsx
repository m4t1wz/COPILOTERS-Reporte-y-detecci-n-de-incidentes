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
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/auth-store';
import { formatAPIError } from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { colors, radius } = useAppTheme();
  const { register } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage('Por favor ingresá tu nombre completo.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresá tu correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor ingresá una contraseña.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: cleanName,
        email: cleanEmail,
        phone_number: phoneNumber.trim() || undefined,
        password,
      });

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

  const handleGoToLogin = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Botón Volver */}
          <PressableSurface
            style={styles.backButton}
            onPress={handleGoToLogin}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de sesión"
          >
            <ArrowLeft size={20} color={colors.textMain} strokeWidth={2} />
            <AccessibleText variant="label" weight="medium" style={styles.backButtonText}>
              Ya tengo cuenta
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
              Crear cuenta
            </AccessibleText>
            <AccessibleText variant="body" muted style={styles.subtitle}>
              Registrate para realizar reportes de incidentes en Formosa.
            </AccessibleText>

            <ErrorBanner message={errorMessage} />

            {/* Nombre Completo */}
            <View style={styles.inputGroup}>
              <AccessibleText variant="label" weight="medium" style={styles.inputLabel}>
                Nombre y apellido
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
                placeholder="Juan Pérez"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
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
                placeholder="ciudadano@correo.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Teléfono de Contacto */}
            <View style={styles.inputGroup}>
              <AccessibleText variant="label" weight="medium" style={styles.inputLabel}>
                Teléfono de contacto (opcional)
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
                placeholder="+54 370 4123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            {/* Contraseña */}
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
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Confirmar Contraseña */}
            <View style={styles.inputGroup}>
              <AccessibleText variant="label" weight="medium" style={styles.inputLabel}>
                Confirmar contraseña
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
                placeholder="Repetí tu contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Botón Registrar */}
            <PrimaryButton
              title="Registrarme"
              onPress={handleRegister}
              loading={isSubmitting}
              icon={<UserPlus size={18} color={colors.onPrimary} strokeWidth={2} />}
              style={styles.submitButton}
            />

            <PressableSurface
              onPress={handleGoToLogin}
              style={styles.loginLinkContainer}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión con cuenta existente"
            >
              <AccessibleText variant="body" style={styles.loginText}>
                ¿Ya tenés cuenta?{' '}
                <AccessibleText weight="semibold" style={{ color: colors.primary }}>
                  Iniciar sesión.
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
    paddingVertical: 32,
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
    marginBottom: 14,
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
    marginTop: 10,
    marginBottom: 16,
  },
  loginLinkContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loginText: {
    textAlign: 'center',
  },
});
