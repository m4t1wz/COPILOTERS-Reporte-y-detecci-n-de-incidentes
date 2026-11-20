import React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { PressableSurface } from '../../components/common/PressableSurface';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatAPIError } from '../../services/api';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { ReportCard } from '../../components/reports/ReportCard';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useAppTheme } from '../../context/ThemeContext';
import { reportService } from '../../services/report-service';

export default function MyReportsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => reportService.getMyReports(),
  });

  const handleBack = () => {
    router.replace('/');
  };

  const handleSelectReport = (reportId: string) => {
    router.push(`/my-reports/${reportId}`);
  };

  const handleNewReport = () => {
    router.push('/report/new');
  };

  const reports = data?.items || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Directo y Funcional */}
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
          Mis reportes
        </AccessibleText>
        <PressableSurface
          onPress={handleNewReport}
          style={styles.newReportBtn}
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo reporte"
        >
          <Plus size={22} color={colors.primary} strokeWidth={2.2} />
        </PressableSurface>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AccessibleText variant="body" style={styles.loadingText}>
            Cargando tus reportes...
          </AccessibleText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color="#D32F2F" strokeWidth={2} />
          <AccessibleText variant="body" style={styles.errorText}>
            {formatAPIError(error)}
          </AccessibleText>
          <PrimaryButton
            title="Reintentar"
            variant="secondary"
            onPress={() => refetch()}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ReportCard item={item} onPress={handleSelectReport} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AccessibleText variant="heading3" weight="semibold" style={styles.emptyTitle}>
                Todavía no realizaste ningún reporte
              </AccessibleText>
              <AccessibleText variant="body" muted style={styles.emptySubtitle}>
                Cuando informes un incidente en Formosa, podrás seguir su evolución y estado desde acá.
              </AccessibleText>
              <PrimaryButton
                title="Informar un incidente"
                onPress={handleNewReport}
                icon={<Plus size={18} color={colors.onPrimary} strokeWidth={2} />}
                style={styles.emptyButton}
              />
            </View>
          }
        />
      )}
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
  newReportBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    width: '100%',
    maxWidth: 280,
  },
});
