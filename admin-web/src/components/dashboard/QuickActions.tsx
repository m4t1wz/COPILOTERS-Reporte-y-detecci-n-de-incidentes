// Acciones rápidas: acceso a los casos pendientes más antiguos (04 §5.1.3).
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAX_PAGE_SIZE } from '../../core/constants';
import { useReports } from '../../hooks/use-reports';
import { addressDisplay } from '../../utils/address';
import { formatDateTime } from '../../utils/date';
import { CategoryPill } from '../common/CategoryPill';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ICON_STROKE } from '../common/status-styles';

const OLDEST_COUNT = 5;

export function QuickActions() {
  const { data, isLoading, error } = useReports({ status: 'pendiente', page_size: MAX_PAGE_SIZE });
  const oldest = [...(data?.items ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, OLDEST_COUNT);

  return (
    <section className="flex flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Clock size={20} strokeWidth={ICON_STROKE} style={{ color: '#F9A825' }} />
        <h2 className="text-[16px] font-semibold">Pendientes más antiguos</h2>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="p-4">
            <LoadingSkeleton lines={4} />
          </div>
        ) : error ? (
          <p role="alert" className="px-4 py-6 text-sm text-brand-dark">
            {error.message}
          </p>
        ) : oldest.length === 0 ? (
          <p className="px-4 py-6 text-sm text-typography-muted">Sin reportes pendientes.</p>
        ) : (
          <ul>
            {oldest.map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <Link
                  to={`/reports/${item.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors duration-150 ease-out hover:bg-brand-soft/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-brand">{item.report_number}</span>
                    <span className="text-xs text-typography-muted">{formatDateTime(item.created_at)}</span>
                  </div>
                  <CategoryPill category={item.category} variant="inline" />
                  <span className="truncate text-xs text-typography-muted">
                    {addressDisplay(item.location.address_reference, item.location.latitude, item.location.longitude).label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to="/reports?status=pendiente"
        className="flex items-center justify-between border-t border-border px-4 py-3 text-sm font-semibold text-typography-main transition-colors duration-150 ease-out hover:bg-brand-soft"
      >
        Ver todos los pendientes
        <ArrowRight size={16} strokeWidth={2} />
      </Link>
    </section>
  );
}
