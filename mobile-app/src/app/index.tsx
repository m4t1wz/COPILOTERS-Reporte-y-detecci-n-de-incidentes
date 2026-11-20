import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Animated,
  SafeAreaView,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { refreshMapQueries } from '../hooks/useIncidents';
import { Plus, ClipboardList, Settings, Filter, X, Check } from 'lucide-react-native';
import { MapLibreView } from '../components/map/MapLibreView';
import { AccessibleText } from '../components/common/AccessibleText';
import { PressableSurface } from '../components/common/PressableSurface';
import { useModalEnter } from '../hooks/useModalEnter';
import { theme } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/auth-store';
import { INCIDENT_CATEGORIES } from '../constants/categories';
import { IncidentCategory } from '../types';

export default function MainMapScreen() {
  const router = useRouter();
  const { colors, radius, fontScale } = useAppTheme();
  const { isAuthenticated } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const queryClient = useQueryClient();
  const isFirstFocus = useRef(true);

  // La pantalla del mapa queda montada debajo de las demás: al volver a ella (ficha, reporte, ajustes)
  // se piden de nuevo los incidentes para que no queden visibles reportes ya resueltos o descartados.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refreshMapQueries(queryClient);
    }, [queryClient])
  );
  const { backdropStyle, cardStyle } = useModalEnter(showFilterModal);

  const handleNavigateToReport = () => {
    if (isAuthenticated) {
      router.push('/report/new');
    } else {
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: '/report/new' },
      });
    }
  };

  const handleNavigateToMyReports = () => {
    if (isAuthenticated) {
      router.push('/my-reports');
    } else {
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: '/my-reports' },
      });
    }
  };

  const handleNavigateToSettings = () => {
    router.push('/settings');
  };

  const handleSelectIncident = (incidentId: string) => {
    router.push(`/incident/${incidentId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapLibreView
        onSelectIncident={handleSelectIncident}
        selectedCategory={selectedCategory}
      >
        {/* Barra superior de controles sobre el mapa */}
        <SafeAreaView style={styles.safeHeader}>
          <View style={styles.headerRow}>
            {/* Botón «Mis reportes» */}
            <PressableSurface
              style={[
                styles.topButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.button,
                },
              ]}
              onPress={handleNavigateToMyReports}
              accessibilityRole="button"
              accessibilityLabel="Mis reportes"
            >
              <ClipboardList size={18} color={colors.primary} strokeWidth={2} />
              <AccessibleText
                variant="label"
                weight="medium"
                style={[styles.topButtonText, { color: colors.textMain }]}
              >
                Mis reportes
              </AccessibleText>
            </PressableSurface>

            <View style={styles.headerRight}>
              {/* Botón Filtro Rápido */}
              <PressableSurface
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: selectedCategory ? colors.primarySoft : colors.surface,
                    borderColor: selectedCategory ? colors.primary : colors.border,
                    borderRadius: radius.button,
                  },
                ]}
                onPress={() => setShowFilterModal(!showFilterModal)}
                accessibilityRole="button"
                accessibilityLabel="Filtrar por categoría"
              >
                <Filter
                  size={18}
                  color={selectedCategory ? colors.primary : colors.textMain}
                  strokeWidth={2}
                />
              </PressableSurface>

              {/* Botón Configuración */}
              <PressableSurface
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.button,
                  },
                ]}
                onPress={handleNavigateToSettings}
                accessibilityRole="button"
                accessibilityLabel="Configuración y accesibilidad"
              >
                <Settings size={18} color={colors.textMain} strokeWidth={2} />
              </PressableSurface>
            </View>
          </View>
        </SafeAreaView>

        {/* Modal de Filtro por Categoría con ScrollView y límites seguros */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType="none"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <Animated.View style={[styles.modalOverlay, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowFilterModal(false)}
              accessibilityLabel="Cerrar filtro"
            />
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.card,
                },
                cardStyle,
              ]}
            >
              {/* Header del Modal */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.modalHeaderTitleRow}>
                  <Filter size={18} color={colors.primary} strokeWidth={2} />
                  <AccessibleText variant="heading3" weight="semibold" style={styles.modalTitleText}>
                    Filtrar por categoría
                  </AccessibleText>
                </View>
                <PressableSurface
                  onPress={() => setShowFilterModal(false)}
                  style={[styles.closeBtn, { borderRadius: radius.button }]}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar filtro"
                >
                  <X size={20} color={colors.textMuted} strokeWidth={1.75} />
                </PressableSurface>
              </View>

              {/* Lista con ScrollView con altura acotada y scroll suave */}
              <ScrollView
                style={styles.filterScrollView}
                contentContainerStyle={styles.filterScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <PressableSurface
                  style={[
                    styles.filterOption,
                    { borderRadius: radius.button },
                    !selectedCategory && {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(undefined);
                    setShowFilterModal(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !selectedCategory }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.filterDot, { backgroundColor: colors.textMuted }]} />
                    <AccessibleText
                      variant="body"
                      weight={!selectedCategory ? 'semibold' : 'regular'}
                      style={{ color: !selectedCategory ? colors.primaryDark : colors.textMain }}
                    >
                      Todas las categorías
                    </AccessibleText>
                  </View>
                  {!selectedCategory && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                </PressableSurface>

                {Object.keys(INCIDENT_CATEGORIES).map((key) => {
                  const cat = INCIDENT_CATEGORIES[key as IncidentCategory];
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <PressableSurface
                      key={cat.key}
                      style={[
                        styles.filterOption,
                        { borderRadius: radius.button },
                        isSelected && {
                          backgroundColor: colors.primarySoft,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat.key);
                        setShowFilterModal(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.filterDot, { backgroundColor: cat.color }]} />
                        <AccessibleText
                          variant="body"
                          weight={isSelected ? 'semibold' : 'regular'}
                          style={{ color: isSelected ? colors.primaryDark : colors.textMain }}
                        >
                          {cat.label}
                        </AccessibleText>
                      </View>
                      {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                    </PressableSurface>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* Botón Flotante Central Inferior «Informar» */}
        <View style={styles.floatingButtonContainer}>
          <PressableSurface
            style={[
              styles.informarButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.informarBtn, // 10px exactos
              },
            ]}
            onPress={handleNavigateToReport}
            accessibilityRole="button"
            accessibilityLabel="Informar"
          >
            <Plus size={20} color={colors.primary} strokeWidth={2} />
            <AccessibleText
              weight="semibold"
              style={[styles.informarButtonText, { color: colors.primary }]}
            >
              Informar
            </AccessibleText>
          </PressableSurface>
        </View>
      </MapLibreView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 0,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  topButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topButtonText: {
    marginLeft: 6,
    fontSize: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitleText: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  filterScrollView: {
    maxHeight: 380,
  },
  filterScrollContent: {
    padding: 12,
    gap: 6,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 48,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 32, // Margen seguro inferior exacto
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  informarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minHeight: 52,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,        // Sombra mínima y limpia
    shadowRadius: 8,
    elevation: 3,
  },
  informarButtonText: {
    fontSize: 15,
    marginLeft: 8,
  },
});
