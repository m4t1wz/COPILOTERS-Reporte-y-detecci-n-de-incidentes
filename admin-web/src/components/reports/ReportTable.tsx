// Tabla paginada de reportes — 04. admin-web.md §5.2 · 08. visual-design-system.md §9.
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Paginated } from '../../types/common';
import type { AdminReportItem } from '../../types/report';
import { addressDisplay } from '../../utils/address';
import { formatCoordinates, formatDateTime } from '../../utils/date';
import { CategoryPill } from '../common/CategoryPill';
import { StatusBadge } from '../common/StatusBadge';
import { ICON_STROKE } from '../common/status-styles';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ReportTableProps {
  data: Paginated<AdminReportItem> | undefined;
  loading: boolean;
  fetching: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const COLUMNS = ['Identificador', 'Categoría', 'Ubicación', 'Fecha y hora', 'Foto', 'Estado', 'Acciones'];

export function ReportTable({ data, loading, fetching, onPageChange, onPageSizeChange }: ReportTableProps) {
  const items = data?.items ?? [];
  const p = data?.pagination;
  const from = p && p.total_items > 0 ? (p.page - 1) * p.page_size + 1 : 0;
  const to = p ? Math.min(p.page * p.page_size, p.total_items) : 0;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className={fetching && !loading ? 'opacity-70 transition-opacity duration-150' : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-base">
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="px-4 py-2.5 text-xs font-medium text-typography-muted">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      {COLUMNS.map((c) => (
                        <td key={c} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-base" />
                        </td>
                      ))}
                    </tr>
                  ))
                : items.map((item) => <ReportRow key={item.id} item={item} />)}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-typography-muted">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
        <label className="flex items-center gap-2 text-typography-muted">
          Por página
          <select
            className="h-8 rounded-field border border-border bg-surface px-2 text-sm text-typography-main focus:border-brand focus:outline-none"
            value={p?.page_size ?? PAGE_SIZE_OPTIONS[1]}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <span className="text-typography-muted">
            {from}–{to} de {p?.total_items ?? 0}
          </span>
          <div className="flex items-center gap-1">
            <PageButton
              label="Página anterior"
              disabled={!p?.has_prev}
              onClick={() => p && onPageChange(p.page - 1)}
            >
              <ChevronLeft size={18} strokeWidth={ICON_STROKE} />
            </PageButton>
            <span className="min-w-[64px] text-center font-medium">
              {p ? `${p.page} / ${p.total_pages}` : '–'}
            </span>
            <PageButton label="Página siguiente" disabled={!p?.has_next} onClick={() => p && onPageChange(p.page + 1)}>
              <ChevronRight size={18} strokeWidth={ICON_STROKE} />
            </PageButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ item }: { item: AdminReportItem }) {
  const { latitude, longitude, address_reference } = item.location;
  const address = addressDisplay(address_reference, latitude, longitude);
  return (
    <tr className="border-b border-border transition-colors duration-150 ease-out last:border-b-0 hover:bg-brand-soft/50">
      <td className="px-4 py-3 align-middle">
        <Link to={`/reports/${item.id}`} className="text-sm font-semibold text-brand hover:text-brand-dark">
          {item.report_number}
        </Link>
      </td>
      <td className="px-4 py-3 align-middle">
        <CategoryPill category={item.category} variant="inline" />
      </td>
      <td className="max-w-[280px] px-4 py-3 align-middle">
        <div className="truncate text-sm text-typography-main" title={address.label}>
          {address.label}
        </div>
        {address.showCoordinates && (
          <div className="text-xs text-typography-muted">{formatCoordinates(latitude, longitude)}</div>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle text-sm">{formatDateTime(item.created_at)}</td>
      <td className="px-4 py-3 align-middle">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={`Foto del reporte ${item.report_number}`}
            loading="lazy"
            className="h-10 w-14 rounded border border-border object-cover"
          />
        ) : (
          <span className="flex h-10 w-14 items-center justify-center rounded border border-border bg-base text-typography-muted">
            <ImageOff size={16} strokeWidth={2} aria-label="Sin foto" />
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <StatusBadge status={item.current_status} />
      </td>
      <td className="px-4 py-3 align-middle">
        <Link
          to={`/reports/${item.id}`}
          className="inline-flex h-8 items-center rounded-btn border border-border bg-surface px-3 text-sm font-semibold text-typography-main transition-colors duration-150 ease-out hover:bg-brand-soft"
        >
          Gestionar
        </Link>
      </td>
    </tr>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-btn border border-border bg-surface text-typography-main transition-colors duration-150 ease-out hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface"
    >
      {children}
    </button>
  );
}
