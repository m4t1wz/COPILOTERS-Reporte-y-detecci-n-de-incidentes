// Tarjeta flotante al seleccionar un marcador o una zona de concentración (04 §2, PROJECT_CONTEXT §1.E).
import { ArrowRight, Calendar, Layers, MapPin } from 'lucide-react';
import { Popup } from 'react-map-gl/maplibre';
import { Link } from 'react-router-dom';
import type { ClusterProperties, IncidentProperties } from '../../types/incident';
import { addressDisplay } from '../../utils/address';
import { formatDateTime } from '../../utils/date';
import { CategoryPill } from '../common/CategoryPill';
import { StatusBadge } from '../common/StatusBadge';
import { ICON_STROKE } from '../common/status-styles';

export type MapSelection =
  | { kind: 'incident'; longitude: number; latitude: number; properties: IncidentProperties }
  | { kind: 'cluster'; longitude: number; latitude: number; properties: ClusterProperties };

interface IncidentPopupProps {
  selection: MapSelection;
  onClose: () => void;
}

export function IncidentPopup({ selection, onClose }: IncidentPopupProps) {
  return (
    <Popup
      longitude={selection.longitude}
      latitude={selection.latitude}
      onClose={onClose}
      closeOnClick={false}
      maxWidth="300px"
      className="nexo-popup"
    >
      {selection.kind === 'incident' ? (
        <IncidentContent p={selection.properties} latitude={selection.latitude} longitude={selection.longitude} />
      ) : (
        <ClusterContent p={selection.properties} />
      )}
    </Popup>
  );
}

function IncidentContent({ p, latitude, longitude }: { p: IncidentProperties; latitude: number; longitude: number }) {
  return (
    <div className="flex flex-col gap-2 font-sans text-typography-main">
      <div className="flex items-center justify-between gap-3 pr-5">
        <span className="text-sm font-semibold text-brand">{p.report_number}</span>
        <StatusBadge status={p.status} />
      </div>
      <CategoryPill category={p.category} variant="inline" />
      <div className="flex items-start gap-1.5 text-xs text-typography-muted">
        <MapPin size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
        <span>{addressDisplay(p.address_reference, latitude, longitude).label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-typography-muted">
        <Calendar size={14} strokeWidth={2} className="shrink-0" />
        <span>{formatDateTime(p.created_at)}</span>
      </div>
      <Link
        to={`/reports/${p.report_id}`}
        className="mt-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-btn border border-border bg-surface px-3 text-sm font-semibold text-typography-main transition-colors duration-150 ease-out hover:bg-brand-soft"
      >
        Ver ficha
        <ArrowRight size={16} strokeWidth={2} />
      </Link>
    </div>
  );
}

function ClusterContent({ p }: { p: ClusterProperties }) {
  return (
    <div className="flex flex-col gap-2 pr-5 font-sans text-typography-main">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Layers size={18} strokeWidth={ICON_STROKE} style={{ color: p.color }} />
        Zona de concentración
      </div>
      <CategoryPill category={p.category} variant="inline" />
      <p className="text-xs">{p.description}</p>
      <div className="text-xs text-typography-muted">
        {p.incident_count} reportes · {formatDateTime(p.window_start)} a {formatDateTime(p.window_end)}
      </div>
    </div>
  );
}
