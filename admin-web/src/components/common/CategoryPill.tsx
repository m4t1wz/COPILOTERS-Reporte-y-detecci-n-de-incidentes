import { CATEGORIES } from '../../core/constants';
import type { IncidentCategory } from '../../types/report';
import { cn } from '../../utils/cn';

interface CategoryPillProps {
  category: IncidentCategory;
  /** `chip`: etiqueta con borde. `inline`: indicador de color + texto (columna de tabla). */
  variant?: 'chip' | 'inline';
  className?: string;
}

/** Indicador con el color oficial de la categoría (02 §2.2). */
export function CategoryPill({ category, variant = 'chip', className }: CategoryPillProps) {
  const { label, color } = CATEGORIES[category];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-typography-main',
        variant === 'chip'
          ? 'rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium'
          : 'text-sm font-normal',
        className,
      )}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}
