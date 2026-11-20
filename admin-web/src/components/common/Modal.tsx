import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { ICON_STROKE } from './status-styles';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Superficie modal: blanca, radio 8 px, sombra permitida (08 §4.2), apertura 200 ms ease-out. */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-typography-main/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-lg animate-modal-in flex-col rounded-card border border-border bg-surface shadow-overlay',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-xl font-semibold leading-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1 text-typography-muted transition-colors duration-150 ease-out hover:bg-brand-soft hover:text-typography-main"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={ICON_STROKE} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
