import React from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ClipboardList, Map } from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useAppTheme } from '../../context/ThemeContext';
import { ReportConfirmation } from '../../types';
import { formatArgentinaDate } from '../../utils/date-formatter';

export default function ConfirmationScreen() {
  const router = useRouter();
  const { confirmationData } = useLocalSearchParams<{ confirmationData?: string }>();
  const { colors, radius } = useAppTheme();

  let data: ReportConfirmation | null = null;
  if (confirmationData) {
    try {
      data = JSON.parse(confirmationData);
    } catch {
      data = null;
    }
  }

  const handleGoToMyReports = () => {
    router.replace('/my-reports');
  };

  const handleBackToMap = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta de Confirmación Estructurada Literalmente según la Especificación */}
        <View style={[styles.confirmationCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
          {/* Header con Check en Verde */}
          <View style={styles.cardHeader}>
            <CheckCircle2 size={40} color="#2E7D32" strokeWidth={2.2} />
            <AccessibleText variant="heading2" weight="bold" style={styles.headerTitle}>
              Reporte enviado correctamente
            </AccessibleText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Datos del reporte */}
          <View style={styles.dataSection}>
            {/* REPORTE #00000 */}
            <AccessibleText variant="heading1" weight="bold" style={[styles.reportNumber, { color: colors.primary }]}>
              REPORTE {data?.report_number || '#00000'}
            </AccessibleText>

            {/* Categoría */}
            <View style={styles.fieldRow}>
              <AccessibleText variant="small" muted weight="medium">
                Categoría:
              </AccessibleText>
              <AccessibleText variant="body" weight="semibold">
                {data?.category_label || 'Incidente territorial'}
              </AccessibleText>
            </View>

            {/* Ubicación */}
            <View style={styles.fieldRow}>
              <AccessibleText variant="small" muted weight="medium">
                Ubicación:
              </AccessibleText>
              <AccessibleText variant="body" weight="medium">
                {data?.location.address_reference || 'Formosa'}
              </AccessibleText>
            </View>

            {/* Fecha y hora - DD/MM/AAAA (HH:MM) */}
            <View style={styles.fieldRow}>
              <AccessibleText variant="small" muted weight="medium">
                Fecha y hora:
              </AccessibleText>
              <AccessibleText variant="body">
                {formatArgentinaDate(data?.created_at)}
              </AccessibleText>
            </View>

            {/* Estado: Pendiente */}
            <View style={styles.fieldRow}>
              <AccessibleText variant="small" muted weight="medium">
                Estado:
              </AccessibleText>
              <AccessibleText variant="body" weight="semibold" style={{ color: '#F9A825' }}>
                {data?.status_label || 'Pendiente'}
              </AccessibleText>
            </View>

            {/* Mensaje: El aviso fue recibido. */}
            <View style={styles.fieldRow}>
              <AccessibleText variant="small" muted weight="medium">
                Mensaje:
              </AccessibleText>
              <AccessibleText variant="body" style={styles.statusMessage}>
                {data?.status_message || 'El aviso fue recibido.'}
              </AccessibleText>
            </View>
          </View>

          {/* Botones de Acción */}
          <View style={styles.actionsContainer}>
            <PrimaryButton
              title="Ver en Mis Reportes"
              onPress={handleGoToMyReports}
              icon={<ClipboardList size={18} color={colors.onPrimary} strokeWidth={2} />}
              style={styles.actionBtn}
            />

            <PrimaryButton
              title="Volver al Mapa"
              variant="secondary"
              onPress={handleBackToMap}
              icon={<Map size={18} color={colors.textMain} strokeWidth={2} />}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  confirmationCard: {
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    marginTop: 10,
    color: '#2E7D32', // Verde
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  dataSection: {
    marginVertical: 8,
    gap: 12,
  },
  reportNumber: {
    textAlign: 'center',
    marginBottom: 8,
  },
  fieldRow: {
    gap: 2,
  },
  statusMessage: {
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  actionBtn: {
    minHeight: 52,
  },
});
