import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

/** Indicador de carga vectorial en el color principal (08 §6.2). */
export function Spinner({ size = 20, className, label = 'Cargando' }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      strokeWidth={2}
      className={cn('animate-spin text-brand', className)}
      role="status"
      aria-label={label}
    />
  );
}
