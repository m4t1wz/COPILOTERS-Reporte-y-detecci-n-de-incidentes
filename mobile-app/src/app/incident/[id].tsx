import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { PressableSurface } from '../../components/common/PressableSurface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, MapPin, Calendar, Clock, AlertTriangle } from 'lucide-react-native';
import { useIncidentDetailQuery } from '../../hooks/useIncidents';
import { AccessibleText } from '../../components/common/AccessibleText';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { formatAPIError } from '../../services/api';
import { useAppTheme } from '../../context/ThemeContext';
import { formatArgentinaDate } from '../../utils/date-formatter';

export default function IncidentDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radius } = useAppTheme();

  const { data: incident, isLoading, error } = useIncidentDetailQuery(id);

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Modal */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <AccessibleText variant="heading2" weight="semibold">
          Ficha de incidente
        </AccessibleText>
        <PressableSurface
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Cerrar ficha"
        >
          <X size={22} color={colors.textMain} strokeWidth={2} />
        </PressableSurface>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AccessibleText style={styles.loadingText}>Cargando información del incidente...</AccessibleText>
          </View>
        )}

        {error && (
          <ErrorBanner message={formatAPIError(error)} />
        )}

        {incident && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            {/* Cabecera del Incidente */}
            <View style={styles.cardHeader}>
              <View>
                <AccessibleText variant="heading1" weight="bold" style={{ color: colors.primary }}>
                  {incident.report_number}
                </AccessibleText>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: incident.color }]} />
                  <AccessibleText variant="heading3" weight="semibold">
                    {incident.category_label}
                  </AccessibleText>
                </View>
              </View>
              <StatusBadge status={incident.status} label={incident.status_label} />
            </View>

            {/* Fotografía si existe */}
            {incident.photo_url ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: incident.photo_url }}
                  style={[styles.photo, { backgroundColor: colors.background, borderRadius: radius.card }]}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {/* Metadatos */}
            <View style={styles.metaSection}>
              {/* Ubicación */}
              <View style={styles.metaRow}>
                <MapPin size={18} color={colors.primary} strokeWidth={2} style={styles.metaIcon} />
                <View style={styles.metaTextContainer}>
                  <AccessibleText variant="small" weight="medium" muted>
                    Ubicación georreferenciada
                  </AccessibleText>
                  <AccessibleText variant="body" weight="medium">
                    {incident.location.address_reference}
                  </AccessibleText>
                  <AccessibleText variant="small" muted>
                    ({incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)})
                  </AccessibleText>
                </View>
              </View>

              {/* Fecha y Hora */}
              <View style={styles.metaRow}>
                <Calendar size={18} color={colors.textMuted} strokeWidth={2} style={styles.metaIcon} />
                <View style={styles.metaTextContainer}>
                  <AccessibleText variant="small" weight="medium" muted>
                    Fecha y hora de registro (UTC-3)
                  </AccessibleText>
                  <AccessibleText variant="body">
                    {formatArgentinaDate(incident.created_at)}
                  </AccessibleText>
                </View>
              </View>
            </View>

            {/* Botón Volver */}
            <View style={styles.actionContainer}>
              <PrimaryButton
                title="Volver al Mapa"
                variant="secondary"
                onPress={handleClose}
              />
            </View>
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 6,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  photoContainer: {
    marginVertical: 16,
  },
  photo: {
    width: '100%',
    height: 220,
  },
  metaSection: {
    marginVertical: 12,
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  metaTextContainer: {
    flex: 1,
  },
  actionContainer: {
    marginTop: 24,
  },
});
