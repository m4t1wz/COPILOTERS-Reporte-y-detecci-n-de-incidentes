// Barra de filtros de la tabla — 04. admin-web.md §5.2 · parámetros de GET /admin/reports (02 §6).
import { Calendar, Filter, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_KEYS, STATUS_KEYS, STATUS_LABELS } from '../../core/constants';
import type { IncidentCategory, ReportStatus } from '../../types/report';
import { ICON_STROKE } from '../common/status-styles';

export interface ReportFilterValues {
  status?: ReportStatus;
  category?: IncidentCategory;
  /** Día `YYYY-MM-DD` (hora argentina). */
  start?: string;
  end?: string;
  search?: string;
}

interface ReportFiltersProps {
  values: ReportFilterValues;
  onChange: (patch: Partial<ReportFilterValues>) => void;
  onReset: () => void;
}

const fieldClass =
  'h-9 rounded-field border border-border bg-surface px-2 text-sm text-typography-main focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

const SEARCH_DEBOUNCE_MS = 300;

export function ReportFilters({ values, onChange, onReset }: ReportFiltersProps) {
  const [search, setSearch] = useState(values.search ?? '');

  useEffect(() => setSearch(values.search ?? ''), [values.search]);

  useEffect(() => {
    if ((values.search ?? '') === search) return;
    const t = setTimeout(() => onChange({ search: search || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, values.search, onChange]);

  const active = Boolean(values.status || values.category || values.start || values.end || values.search);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-surface p-3">
      <Filter size={18} strokeWidth={ICON_STROKE} className="text-typography-muted" aria-hidden />

      <select
        aria-label="Estado"
        className={fieldClass}
        value={values.status ?? ''}
        onChange={(e) => onChange({ status: (e.target.value || undefined) as ReportStatus | undefined })}
      >
        <option value="">Todos los estados</option>
        {STATUS_KEYS.map((key) => (
          <option key={key} value={key}>
            {STATUS_LABELS[key]}
          </option>
        ))}
      </select>

      <select
        aria-label="Categoría"
        className={fieldClass}
        value={values.category ?? ''}
        onChange={(e) => onChange({ category: (e.target.value || undefined) as IncidentCategory | undefined })}
      >
        <option value="">Todas las categorías</option>
        {CATEGORY_KEYS.map((key) => (
          <option key={key} value={key}>
            {CATEGORIES[key].label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <Calendar size={18} strokeWidth={ICON_STROKE} className="text-typography-muted" aria-hidden />
        <input
          type="date"
          aria-label="Desde"
          className={fieldClass}
          value={values.start ?? ''}
          max={values.end}
          onChange={(e) => onChange({ start: e.target.value || undefined })}
        />
        <span className="text-typography-muted">a</span>
        <input
          type="date"
          aria-label="Hasta"
          className={fieldClass}
          value={values.end ?? ''}
          min={values.start}
          onChange={(e) => onChange({ end: e.target.value || undefined })}
        />
      </div>

      <div className="relative min-w-[220px] flex-1">
        <Search
          size={18}
          strokeWidth={ICON_STROKE}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-typography-muted"
        />
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar en comentario o dirección"
          className={`${fieldClass} w-full pl-9`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {active && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1 rounded-btn px-2 text-sm font-medium text-typography-muted transition-colors duration-150 ease-out hover:bg-brand-soft hover:text-typography-main"
        >
          <X size={16} strokeWidth={2} />
          Limpiar
        </button>
      )}
    </div>
  );
}
