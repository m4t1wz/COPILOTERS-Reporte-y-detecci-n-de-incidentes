// Mapa principal con máscara, zonas de concentración e incidentes — docs/tecnica/04. admin-web.md §4
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import {
  FORMOSA_MASK_URL,
  MAP_CENTER,
  MAP_INITIAL_ZOOM,
  MAP_MAX_BOUNDS,
  MAP_STYLE_URL,
  MASK_FILL_COLOR,
  MASK_FILL_OPACITY,
  MASK_LINE_COLOR,
  MASK_LINE_WIDTH,
} from '../../core/constants';
import { useClusters, useIncidents } from '../../hooks/use-incidents';
import type { ClusterProperties, IncidentFilters, IncidentProperties } from '../../types/incident';
import { cn } from '../../utils/cn';
import { WifiOff } from 'lucide-react';
import { Spinner } from '../common/Spinner';
import { IncidentPopup, type MapSelection } from './IncidentPopup';

const INCIDENTS_LAYER = 'incidents-points';
const CLUSTERS_LAYER = 'clusters-fill';

export interface MapFocus {
  longitude: number;
  latitude: number;
  zoom?: number;
  color?: string;
}

interface AdminMapProps {
  filters?: IncidentFilters;
  showIncidents?: boolean;
  showClusters?: boolean;
  /** Centra el mapa en un punto y lo resalta (ficha del incidente). */
  focus?: MapFocus;
  className?: string;
  children?: ReactNode;
}

export function AdminMap({
  filters = {},
  showIncidents = true,
  showClusters = true,
  focus,
  className,
  children,
}: AdminMapProps) {
  const incidents = useIncidents(filters);
  const clusters = useClusters();
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [cursor, setCursor] = useState<string>('');

  const interactiveLayerIds = useMemo(
    () => [...(showIncidents ? [INCIDENTS_LAYER] : []), ...(showClusters ? [CLUSTERS_LAYER] : [])],
    [showIncidents, showClusters],
  );

  const focusData = useMemo(
    () =>
      focus && {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { color: focus.color ?? '#0475EF' },
            geometry: { type: 'Point' as const, coordinates: [focus.longitude, focus.latitude] },
          },
        ],
      },
    [focus],
  );

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) {
      setSelection(null);
      return;
    }
    if (feature.layer.id === INCIDENTS_LAYER) {
      const [longitude, latitude] = (feature.geometry as GeoJSON.Point).coordinates;
      setSelection({
        kind: 'incident',
        longitude,
        latitude,
        properties: feature.properties as unknown as IncidentProperties,
      });
    } else {
      setSelection({
        kind: 'cluster',
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        properties: feature.properties as unknown as ClusterProperties,
      });
    }
  }, []);

  const loading = (showIncidents && incidents.isLoading) || (showClusters && clusters.isLoading);
  const loadError = (showIncidents && incidents.error) || (showClusters && clusters.error) || null;

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-base', className)}>
      <Map
        mapStyle={MAP_STYLE_URL}
        initialViewState={{
          longitude: focus?.longitude ?? MAP_CENTER[0],
          latitude: focus?.latitude ?? MAP_CENTER[1],
          zoom: focus?.zoom ?? MAP_INITIAL_ZOOM,
        }}
        maxBounds={MAP_MAX_BOUNDS}
        minZoom={6}
        maxZoom={18}
        interactiveLayerIds={interactiveLayerIds}
        onClick={onClick}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('')}
        cursor={cursor}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* 4.2 Máscara invertida: exterior oscurecido y borde provincial */}
        <Source id="formosa-mask-source" type="geojson" data={FORMOSA_MASK_URL}>
          <Layer
            id="formosa-dark-outside"
            type="fill"
            paint={{ 'fill-color': MASK_FILL_COLOR, 'fill-opacity': MASK_FILL_OPACITY }}
          />
          <Layer
            id="formosa-boundary-line"
            type="line"
            paint={{ 'line-color': MASK_LINE_COLOR, 'line-width': MASK_LINE_WIDTH }}
          />
        </Source>

        {/* 4.3 Zonas de concentración */}
        {showClusters && clusters.data && (
          <Source id="clusters-source" type="geojson" data={clusters.data}>
            <Layer
              id={CLUSTERS_LAYER}
              type="fill"
              paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 }}
            />
            <Layer
              id="clusters-stroke"
              type="line"
              paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [2, 1] }}
            />
          </Source>
        )}

        {/* 4.4 Incidentes individuales */}
        {showIncidents && incidents.data && (
          <Source id="incidents-source" type="geojson" data={incidents.data}>
            <Layer
              id={INCIDENTS_LAYER}
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': ['get', 'color'],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </Source>
        )}

        {focusData && (
          <Source id="focus-source" type="geojson" data={focusData}>
            <Layer
              id="focus-point"
              type="circle"
              paint={{
                'circle-radius': 9,
                'circle-color': ['get', 'color'],
                'circle-stroke-width': 2.5,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </Source>
        )}

        {selection && <IncidentPopup selection={selection} onClose={() => setSelection(null)} />}
      </Map>

      {loadError && (
        <div
          role="alert"
          className="absolute left-3 right-3 top-3 flex items-center gap-2 rounded-field border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-dark shadow-float sm:right-auto"
        >
          <WifiOff size={16} strokeWidth={2} className="shrink-0" />
          {loadError.message}
        </div>
      )}
      {loading && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-btn border border-border bg-surface p-2 shadow-float">
          <Spinner size={18} />
        </div>
      )}
      {children}
    </div>
  );
}
