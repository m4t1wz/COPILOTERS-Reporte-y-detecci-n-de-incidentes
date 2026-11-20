// /dashboard — KPIs + mapa operativo + acciones rápidas (04 §5.1, PROJECT_CONTEXT §3.A).
import { Activity, Check, CheckCircle2, ClipboardList, Clock, Layers, XCircle, type LucideIcon } from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { PageHeader } from '../components/layout/PageHeader';
import { AdminMap } from '../components/map/AdminMap';
import { useDashboardStats } from '../hooks/use-dashboard';
import type { DashboardStats } from '../types/report';
import { formatDateTime } from '../utils/date';

interface Metric {
  key: keyof Omit<DashboardStats, 'last_updated'>;
  label: string;
  icon: LucideIcon;
  accent: string;
  to: string;
}

// Orden, etiquetas y acentos de 04. admin-web.md §5.1.
const METRICS: Metric[] = [
  { key: 'total_reports', label: 'Total de reportes', icon: ClipboardList, accent: '#252525', to: '/reports' },
  { key: 'pending_reports', label: 'Pendientes de revisión', icon: Clock, accent: '#F9A825', to: '/reports?status=pendiente' },
  { key: 'verified_reports', label: 'Verificados', icon: CheckCircle2, accent: '#558B2F', to: '/reports?status=verificado' },
  { key: 'in_progress_reports', label: 'En seguimiento', icon: Activity, accent: '#2196F3', to: '/reports?status=en_seguimiento' },
  { key: 'resolved_reports', label: 'Resueltos', icon: Check, accent: '#252525', to: '/reports?status=resuelto' },
  { key: 'discarded_reports', label: 'Descartados', icon: XCircle, accent: '#777777', to: '/reports?status=descartado' },
  { key: 'active_clusters_count', label: 'Zonas de concentración activas', icon: Layers, accent: '#0475EF', to: '/map' },
];

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardStats();

  return (
    <div className="p-6">
      <PageHeader
        title="Resumen"
        meta={data ? `Actualizado ${formatDateTime(data.last_updated)}` : undefined}
      />

      {error && (
        <div role="alert" className="mb-4 rounded-field border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-dark">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {METRICS.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={data?.[m.key]}
            icon={m.icon}
            accent={m.accent}
            loading={isLoading}
            to={m.to}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <section className="h-[480px] overflow-hidden rounded-lg border border-border bg-surface">
          <AdminMap />
        </section>
        <QuickActions />
      </div>
    </div>
  );
}
