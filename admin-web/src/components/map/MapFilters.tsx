// Filtro rápido sobre el mapa: categoría y estado (query params de GET /incidents, 02 §4).
import { Filter, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_KEYS, STATUS_KEYS, STATUS_LABELS } from '../../core/constants';
import { useUIStore } from '../../store/ui-store';
import type { IncidentCategory, ReportStatus } from '../../types/report';
import { cn } from '../../utils/cn';
import { ICON_STROKE } from '../common/status-styles';

const selectClass =
  'h-9 rounded-field border border-border bg-surface px-2 text-sm text-typography-main focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export function MapFilters({ className }: { className?: string }) {
  const { mapFilters, setMapFilters, resetMapFilters } = useUIStore();
  const active = Boolean(mapFilters.category || mapFilters.status);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-2 shadow-float',
        className,
      )}
    >
      <Filter size={18} strokeWidth={ICON_STROKE} className="ml-1 text-typography-muted" aria-hidden />
      <select
        aria-label="Categoría"
        className={selectClass}
        value={mapFilters.category ?? ''}
        onChange={(e) => setMapFilters({ category: (e.target.value || undefined) as IncidentCategory | undefined })}
      >
        <option value="">Todas las categorías</option>
        {CATEGORY_KEYS.map((key) => (
          <option key={key} value={key}>
            {CATEGORIES[key].label}
          </option>
        ))}
      </select>
      <select
        aria-label="Estado"
        className={selectClass}
        value={mapFilters.status ?? ''}
        onChange={(e) => setMapFilters({ status: (e.target.value || undefined) as ReportStatus | undefined })}
      >
        <option value="">Estados activos</option>
        {STATUS_KEYS.map((key) => (
          <option key={key} value={key}>
            {STATUS_LABELS[key]}
          </option>
        ))}
      </select>
      {active && (
        <button
          type="button"
          onClick={resetMapFilters}
          className="inline-flex h-9 items-center gap-1 rounded-btn px-2 text-sm font-medium text-typography-muted transition-colors duration-150 ease-out hover:bg-brand-soft hover:text-typography-main"
        >
          <X size={16} strokeWidth={2} />
          Limpiar
        </button>
      )}
    </div>
  );
}
