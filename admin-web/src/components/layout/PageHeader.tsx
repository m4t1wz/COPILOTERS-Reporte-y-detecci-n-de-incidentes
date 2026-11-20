import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

/** Título de página: Heading 1, 24 px Semibold (08 §3.2). */
export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        {meta && <div className="mt-1 text-xs text-typography-muted">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
