import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { AccessibleText } from '../common/AccessibleText';
import { ErrorBanner } from '../common/ErrorBanner';
import { useAppTheme } from '../../context/ThemeContext';
import { useClustersQuery, useIncidentsQuery } from '../../hooks/useIncidents';
import { formatAPIError } from '../../services/api';
import * as Location from 'expo-location';
import { FormosaMaskLayer } from './FormosaMaskLayer';
import { ClusterPolygonLayer } from './ClusterPolygonLayer';
import { IncidentPinsLayer } from './IncidentPinsLayer';
import { MAP_CONFIG } from '../../constants/map';

let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default || require('@maplibre/maplibre-react-native');
  // Suprimir logs informativos de peticiones canceladas durante zoom in/out (comportamiento normal del motor nativo)
  if (MapLibreGL?.Logger) {
    MapLibreGL.Logger.setLogCallback((log: any) => {
      const { message, tag } = log;
      if (tag === 'Mbgl-HttpRequest' && message?.includes('Canceled')) {
        return true; // Suprime el log para no saturar la consola de Metro
      }
      return false;
    });
  }
} catch {
  // Entorno sin binarios nativos MapLibre
}

export interface MapLibreViewProps {
  onSelectIncident: (incidentId: string) => void;
  selectedCategory?: string;
  children?: React.ReactNode;
}

export const MapLibreView: React.FC<MapLibreViewProps> = ({
  onSelectIncident,
  selectedCategory,
  children,
}) => {
  const cameraRef = useRef<any>(null);
  const { colors } = useAppTheme();
  // Mismas claves de consulta que IncidentPinsLayer y ClusterPolygonLayer: no duplica pedidos.
  const incidents = useIncidentsQuery(selectedCategory ? { category: selectedCategory } : undefined);
  const clusters = useClustersQuery();
  const loadError = incidents.error ?? clusters.error ?? null;
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Verificar permisos de ubicación antes de habilitar UserLocation para evitar SecurityException en Android
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (isMounted) {
          setHasLocationPermission(status === 'granted');
        }
      } catch {
        // En caso de error, mantener deshabilitado
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasNativeMap = Boolean(MapLibreGL?.MapView && Platform.OS !== 'web');

  return (
    <View style={styles.container}>
      {hasNativeMap ? (
        <MapLibreGL.MapView
          style={styles.map}
          mapStyle={MAP_CONFIG.STYLE_URL}
          styleURL={MAP_CONFIG.STYLE_URL}
          logoEnabled={false}
          attributionEnabled={true}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: MAP_CONFIG.FORMOSA_CENTER,
              zoomLevel: MAP_CONFIG.DEFAULT_ZOOM,
            }}
            maxBounds={MAP_CONFIG.FORMOSA_BOUNDS}
            minZoomLevel={MAP_CONFIG.MIN_ZOOM}
            maxZoomLevel={MAP_CONFIG.MAX_ZOOM}
          />

          {/* 1. Capa de Máscara Invertida (Oscurece el exterior de Formosa) */}
          <FormosaMaskLayer />

          {/* 2. Capa de Polígonos de Concentración (Clusters) */}
          <ClusterPolygonLayer />

          {/* 3. Capa de Incidentes (Marcadores Vectoriales) */}
          <IncidentPinsLayer
            onSelectIncident={onSelectIncident}
            filterCategory={selectedCategory}
          />

          {/* 4. Ubicación actual del usuario (únicamente si el permiso de Android está concedido) */}
          {hasLocationPermission && (
            <MapLibreGL.UserLocation visible={true} showsUserHeadingIndicator={true} />
          )}
        </MapLibreGL.MapView>
      ) : (
        <View style={[styles.fallbackMap, { backgroundColor: colors.background }]}>
          <AccessibleText variant="body" muted style={styles.fallbackText}>
            El mapa requiere la aplicación NEXO MAP instalada (versión con mapa nativo).
          </AccessibleText>
        </View>
      )}

      {loadError && (
        <View style={styles.errorOverlay} pointerEvents="none">
          <ErrorBanner message={formatAPIError(loadError)} />
        </View>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  fallbackMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    textAlign: 'center',
  },
  // Debajo de la barra superior de controles del mapa (index.tsx).
  errorOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 84 : 120,
    left: 16,
    right: 16,
    zIndex: 5,
  },
});
