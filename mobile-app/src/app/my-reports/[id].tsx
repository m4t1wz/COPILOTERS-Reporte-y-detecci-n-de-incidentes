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
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, MessageSquare } from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Timeline } from '../../components/timeline/Timeline';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { formatAPIError } from '../../services/api';
import { useAppTheme } from '../../context/ThemeContext';
import { reportService } from '../../services/report-service';

export default function MyReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radius } = useAppTheme();

  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-report-detail', id],
    queryFn: () => (id ? reportService.getMyReportDetail(id) : null),
    enabled: !!id,
  });

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <PressableSurface
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver a mis reportes"
        >
          <ArrowLeft size={22} color={colors.textMain} strokeWidth={2} />
        </PressableSurface>
        <AccessibleText variant="heading2" weight="semibold">
          Seguimiento del reporte
        </AccessibleText>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AccessibleText style={styles.loadingText}>
              Cargando historial del reporte...
            </AccessibleText>
          </View>
        )}

        {error && (
          <ErrorBanner message={formatAPIError(error)} />
        )}

        {report && (
          <View>
            {/* Tarjeta principal con la cabecera requerida literalmente:
                Mi reporte #00000
                [Foto] Categoria
                Ubicación (geodecodificada) y entre paréntesis la coordenada exacta ()
                Estado: Muestra el último estado registrado en el historial del reporte.
            */}
            <View style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
              {/* Título: Mi reporte #00000 */}
              <View style={styles.cardHeaderRow}>
                <AccessibleText variant="heading1" weight="bold" style={{ color: colors.primary }}>
                  Mi reporte {report.report_number}
                </AccessibleText>
                <StatusBadge status={report.current_status} label={report.current_status_label} />
              </View>

              {/* Categoría */}
              <View style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: report.color }]} />
                <AccessibleText variant="heading3" weight="semibold">
                  {report.category_label}
                </AccessibleText>
              </View>

              {/* [Foto] si existe */}
              {report.photo_url ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: report.photo_url }}
                    style={[styles.photo, { backgroundColor: colors.background, borderRadius: radius.card }]}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Ubicación (geodecodificada) y entre paréntesis la coordenada exacta () */}
              <View style={styles.metaRow}>
                <MapPin size={18} color={colors.primary} strokeWidth={2} style={styles.metaIcon} />
                <View style={styles.metaTextContainer}>
                  <AccessibleText variant="small" weight="medium" muted>
                    Ubicación georreferenciada:
                  </AccessibleText>
                  <AccessibleText variant="body" weight="medium">
                    {report.location.address_reference} ({report.location.latitude.toFixed(4)},{' '}
                    {report.location.longitude.toFixed(4)})
                  </AccessibleText>
                </View>
              </View>

              {/* Comentario original del ciudadano */}
              {report.comment ? (
                <View style={[styles.commentBox, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.field }]}>
                  <View style={styles.commentHeader}>
                    <MessageSquare size={16} color={colors.textMuted} strokeWidth={2} />
                    <AccessibleText variant="small" weight="semibold" muted style={{ marginLeft: 6 }}>
                      Tu comentario original:
                    </AccessibleText>
                  </View>
                  <AccessibleText variant="body" style={styles.commentText}>
                    "{report.comment}"
                  </AccessibleText>
                </View>
              ) : null}

              {/* Estado actual */}
              <View style={[styles.currentStatusRow, { borderTopColor: colors.border }]}>
                <AccessibleText variant="body" weight="medium">
                  Estado actual:{' '}
                  <AccessibleText weight="bold" style={{ color: colors.primary }}>
                    {report.current_status_label}
                  </AccessibleText>
                </AccessibleText>
              </View>
            </View>

            {/* Sección: Historial del reporte en formato TimeLine */}
            <View style={styles.timelineSection}>
              <AccessibleText variant="heading2" weight="bold" style={styles.timelineTitle}>
                Historial del reporte
              </AccessibleText>
              <AccessibleText variant="body" muted style={styles.timelineSubtitle}>
                Secuencia cronológica de actualizaciones y comentarios del personal de emergencia:
              </AccessibleText>

              <Timeline timeline={report.timeline} />
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
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  mainCard: {
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  photoContainer: {
    marginVertical: 14,
  },
  photo: {
    width: '100%',
    height: 220,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  metaIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  metaTextContainer: {
    flex: 1,
  },
  commentBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentText: {
    fontStyle: 'italic',
  },
  currentStatusRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timelineSection: {
    marginTop: 8,
  },
  timelineTitle: {
    marginBottom: 4,
  },
  timelineSubtitle: {
    marginBottom: 16,
  },
});
