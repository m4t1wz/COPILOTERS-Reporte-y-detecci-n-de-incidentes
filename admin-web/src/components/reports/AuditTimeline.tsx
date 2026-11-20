// Historial y auditoría — 04. admin-web.md §5.3: del más antiguo al más reciente, línea vertical #E8E5E5,
// nodos circulares, operador en Inter 500, comentario en caja #F7F7F7 con borde, fecha y hora.
import { STATUS_LABELS } from '../../core/constants';
import type { HistoryItem } from '../../types/report';
import { formatDateTime } from '../../utils/date';
import { STATUS_STYLES } from '../common/status-styles';

export function sortHistory(history: HistoryItem[]): HistoryItem[] {
  return [...history].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function historyTitle(item: HistoryItem): string {
  return item.previous_status === null ? 'Reporte recibido' : STATUS_LABELS[item.new_status];
}

export function AuditTimeline({ history }: { history: HistoryItem[] }) {
  const ordered = sortHistory(history);

  return (
    <ol className="relative">
      {ordered.map((item, index) => {
        const last = index === ordered.length - 1;
        const accent = STATUS_STYLES[item.new_status].accent;
        return (
          <li key={item.id} className="relative pb-5 pl-7 last:pb-0">
            {!last && <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />}
            <span
              className="absolute left-0 top-1 h-[11px] w-[11px] rounded-[50%] border-2 bg-surface"
              style={{ borderColor: accent, backgroundColor: last ? accent : undefined }}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-semibold">
                {index + 1}. {historyTitle(item)}
              </span>
              <span className="text-xs text-typography-muted">{formatDateTime(item.created_at)}</span>
            </div>
            <div className="mt-0.5 text-xs text-typography-muted">
              <span className="font-medium text-typography-main">{item.changed_by.name}</span>
              {' · '}
              {item.changed_by.role === 'admin' ? 'Operador' : 'Ciudadano'}
              {item.previous_status && (
                <>
                  {' · '}
                  {STATUS_LABELS[item.previous_status]} a {STATUS_LABELS[item.new_status]}
                </>
              )}
            </div>
            {item.admin_comment && (
              <p className="mt-2 rounded border border-border bg-base px-3 py-2 text-sm leading-relaxed">
                {item.admin_comment}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
