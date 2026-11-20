// Tarjeta de KPI — 04. admin-web.md §5.1: fondo blanco, borde 1px, rounded-lg,
// cifra Inter 600, etiqueta Inter 500 #777777, icono Lucide trazo 1.75.
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { ICON_STROKE } from '../common/status-styles';

interface MetricCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  accent: string;
  loading?: boolean;
  to?: string;
}

export function MetricCard({ label, value, icon: Icon, accent, loading, to }: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-typography-muted">{label}</span>
        <Icon size={20} strokeWidth={ICON_STROKE} style={{ color: accent }} aria-hidden />
      </div>
      {loading || value === undefined ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-base" />
      ) : (
        <div className="mt-2 text-3xl font-semibold leading-tight text-typography-main">
          {value.toLocaleString('es-AR')}
        </div>
      )}
    </>
  );

  const base = 'flex flex-col rounded-lg border border-border bg-surface p-4';
  return to ? (
    <Link to={to} className={cn(base, 'transition-colors duration-150 ease-out hover:bg-brand-soft/40')}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
