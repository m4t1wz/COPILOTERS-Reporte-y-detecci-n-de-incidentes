import { STATUS_LABELS } from '../../core/constants';
import type { ReportStatus } from '../../types/report';
import { cn } from '../../utils/cn';
import { STATUS_STYLES } from './status-styles';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

/** Badge rectangular con borde sutil (04 §5.2: "no cápsula ovalada"). */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { icon: Icon, accent } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-typography-main',
        className,
      )}
    >
      <Icon size={14} strokeWidth={2} color={accent} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
