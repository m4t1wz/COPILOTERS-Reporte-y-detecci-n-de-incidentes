import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ICON_STROKE } from '../components/common/status-styles';

export function NotFoundPage() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-base p-6 text-center">
      <MapPinOff size={32} strokeWidth={ICON_STROKE} className="text-typography-muted" />
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link
        to="/dashboard"
        className="inline-flex h-10 items-center rounded-btn border border-border bg-surface px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-brand-soft"
      >
        Volver al resumen
      </Link>
    </div>
  );
}
