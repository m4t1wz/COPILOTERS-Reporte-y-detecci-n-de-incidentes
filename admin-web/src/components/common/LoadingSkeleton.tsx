import { cn } from '../../utils/cn';

interface LoadingSkeletonProps {
  className?: string;
  /** Cantidad de líneas apiladas. */
  lines?: number;
}

/** Esqueleto con pulso suave sobre fondo #F7F7F7 (08 §6.2). */
export function LoadingSkeleton({ className, lines = 1 }: LoadingSkeletonProps) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={cn('h-4 animate-pulse rounded bg-base', className)} />
      ))}
    </div>
  );
}
