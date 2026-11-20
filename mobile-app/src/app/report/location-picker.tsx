import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Platform,
} from 'react-native';
import { PressableSurface } from '../../components/common/PressableSurface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, MapPin, Check } from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { FormosaMaskLayer } from '../../components/map/FormosaMaskLayer';
import { MAP_CONFIG } from '../../constants/map';
import { useAppTheme } from '../../context/ThemeContext';
import { isInsideFormosa } from '../../hooks/useLocation';

const PIN_SIZE = 42;
const MARKER_DOT_SIZE = 6;

let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default || require('@maplibre/maplibre-react-native');
} catch {
  // Entorno sin binarios nativos MapLibre
}

export default function LocationPickerModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const { colors, radius } = useAppTheme();

  const initialLat = params.lat ? parseFloat(params.lat) : -26.1852;
  const initialLon = params.lon ? parseFloat(params.lon) : -58.1738;

  const [currentCoords, setCurrentCoords] = useState<[number, number]>([initialLon, initialLat]);
  const [isInside, setIsInside] = useState<boolean>(() => isInsideFormosa(initialLat, initialLon));
  const cameraRef = useRef<any>(null);

  const hasNativeMap = Boolean(MapLibreGL?.MapView && Platform.OS !== 'web');

  const handleRegionDidChange = async (feature: any) => {
    const coords = feature?.geometry?.coordinates;
    if (coords && coords.length >= 2) {
      const [lon, lat] = coords;
      setCurrentCoords([lon, lat]);
      setIsInside(isInsideFormosa(lat, lon));
    }
  };

  const handleConfirmLocation = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignorar
    }

    // Regresar al formulario pasando las coordenadas seleccionadas
    router.navigate({
      pathname: '/report/new',
      params: {
        manualLat: String(currentCoords[1]),
        manualLon: String(currentCoords[0]),
      },
    });
  };

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
          accessibilityLabel="Cancelar corrección"
        >
          <ArrowLeft size={22} color={colors.textMain} strokeWidth={2} />
        </PressableSurface>
        <AccessibleText variant="heading3" weight="semibold">
          Corregir ubicación en el mapa
        </AccessibleText>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.mapContainer}>
        {hasNativeMap ? (
          <MapLibreGL.MapView
            style={styles.map}
            mapStyle={MAP_CONFIG.STYLE_URL}
            styleURL={MAP_CONFIG.STYLE_URL}
            logoEnabled={false}
            attributionEnabled={false}
            onRegionDidChange={handleRegionDidChange}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: currentCoords,
                zoomLevel: 15,
              }}
              maxBounds={MAP_CONFIG.FORMOSA_BOUNDS}
              minZoomLevel={MAP_CONFIG.MIN_ZOOM}
              maxZoomLevel={MAP_CONFIG.MAX_ZOOM}
            />
            <FormosaMaskLayer />
          </MapLibreGL.MapView>
        ) : (
          <View style={[styles.fallbackPicker, { backgroundColor: colors.background }]}>
            <AccessibleText variant="body" weight="medium" style={{ textAlign: 'center' }}>
              Arrastrá para simular ajuste de coordenadas:
            </AccessibleText>
            <View style={[styles.coordsBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AccessibleText weight="semibold" style={{ color: colors.primary }}>
                Lat: {currentCoords[1].toFixed(5)}, Lon: {currentCoords[0].toFixed(5)}
              </AccessibleText>
            </View>
            <View style={styles.simControls}>
              <PressableSurface
                style={[styles.simStepBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setCurrentCoords([currentCoords[0] + 0.001, currentCoords[1]])}
              >
                <AccessibleText variant="small">Mover Este (+lon)</AccessibleText>
              </PressableSurface>
              <PressableSurface
                style={[styles.simStepBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setCurrentCoords([currentCoords[0], currentCoords[1] - 0.001])}
              >
                <AccessibleText variant="small">Mover Sur (-lat)</AccessibleText>
              </PressableSurface>
            </View>
          </View>
        )}

        {/* Pin central fijo flotante */}
        <View pointerEvents="none" style={styles.centerMarkerContainer}>
          <View style={styles.markerAnchor}>
            <MapPin size={PIN_SIZE} color={isInside ? colors.primary : '#D32F2F'} strokeWidth={2.5} />
            <View style={[styles.markerDot, { backgroundColor: isInside ? colors.primary : '#D32F2F' }]} />
          </View>
        </View>

        {/* Tarjeta inferior flotante de confirmación */}
        <View style={[styles.bottomCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
          <AccessibleText variant="body" weight="medium" style={styles.instructionText}>
            Desplazá el mapa hasta que el pin apunte al punto exacto del incidente.
          </AccessibleText>

          <View style={styles.coordsDisplayRow}>
            <AccessibleText variant="small" muted>
              Coordenadas: ({currentCoords[1].toFixed(5)}, {currentCoords[0].toFixed(5)})
            </AccessibleText>
          </View>

          {!isInside && (
            <AccessibleText variant="small" style={styles.warningText}>
              Atención: El punto seleccionado se encuentra fuera del territorio de Formosa.
            </AccessibleText>
          )}

          <PrimaryButton
            title="Confirmar ubicación acá"
            onPress={handleConfirmLocation}
            disabled={!isInside}
            icon={<Check size={18} color={colors.onPrimary} strokeWidth={2} />}
            style={styles.confirmButton}
          />
        </View>
      </View>
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  fallbackPicker: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  coordsBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 6,
    marginVertical: 12,
  },
  simControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  simStepBtn: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  // Debe cubrir exactamente el MapView: la coordenada confirmada es el centro del mapa.
  centerMarkerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sube el conjunto para que el punto bajo la punta del pin quede sobre el centro del mapa.
  markerAnchor: {
    alignItems: 'center',
    transform: [{ translateY: -(PIN_SIZE / 2 - 1) }],
  },
  markerDot: {
    width: MARKER_DOT_SIZE,
    height: MARKER_DOT_SIZE,
    borderRadius: MARKER_DOT_SIZE / 2,
    marginTop: -2,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionText: {
    marginBottom: 6,
    textAlign: 'center',
  },
  coordsDisplayRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  warningText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmButton: {
    minHeight: 52,
  },
});
