// /reports/:id — ficha completa, mapa, foto y trazabilidad (04 §5.3).
// Fuente de datos según DOC-PENDIENTE-02: GET /incidents/{id} + GET /admin/reports/{id}/history
// + item de GET /admin/reports (ciudadano y comentario).
import { ArrowLeft, Calendar, History, ImageOff, MapPin, Phone, RefreshCw, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { CategoryPill } from '../components/common/CategoryPill';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { ICON_STROKE } from '../components/common/status-styles';
import { AdminMap } from '../components/map/AdminMap';
import { AuditTimeline, sortHistory } from '../components/reports/AuditTimeline';
import { StatusModal } from '../components/reports/StatusModal';
import { CATEGORIES } from '../core/constants';
import { useIncidentDetail } from '../hooks/use-incidents';
import { useAdminReportItem, useReportHistory } from '../hooks/use-reports';
import type { IncidentCategory, ReportStatus } from '../types/report';
import { addressDisplay } from '../utils/address';
import { formatCoordinates, formatDateTime } from '../utils/date';

interface ReportView {
  id: string;
  reportNumber: string;
  category: IncidentCategory;
  latitude: number;
  longitude: number;
  address: string;
  photoUrl: string | null;
  createdAt: string;
  status: ReportStatus;
}

const card = 'rounded-lg border border-border bg-surface';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useIncidentDetail(id);
  const history = useReportHistory(id);
  const adminItem = useAdminReportItem(id, detail.data?.report_number);
  const [statusOpen, setStatusOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const d = detail.data;
  const a = adminItem.data ?? undefined;
  const events = history.data ? sortHistory(history.data.history) : [];
  const lastEvent = events[events.length - 1];

  const view: ReportView | null =
    d || a
      ? {
          id: (d?.id ?? a?.id)!,
          reportNumber: (d?.report_number ?? a?.report_number)!,
          category: (d?.category ?? a?.category)!,
          latitude: (d?.location.latitude ?? a?.location.latitude)!,
          longitude: (d?.location.longitude ?? a?.location.longitude)!,
          address: d?.location.address_reference ?? a?.location.address_reference ?? '',
          photoUrl: d?.photo_url ?? a?.photo_url ?? null,
          createdAt: (d?.created_at ?? a?.created_at)!,
          // El historial es la fuente de verdad del último estado registrado.
          status: lastEvent?.new_status ?? d?.status ?? a!.current_status,
        }
      : null;

  if (!view) {
    const loading = detail.isLoading || history.isLoading;
    return (
      <div className="p-6">
        <BackLink />
        {loading ? (
          <div className={`${card} mt-4 p-6`}>
            <LoadingSkeleton lines={6} />
          </div>
        ) : (
          <div role="alert" className="mt-4 rounded-field border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-dark">
            {detail.error?.message ?? 'El reporte no existe.'}
          </div>
        )}
      </div>
    );
  }

  const address = addressDisplay(view.address, view.latitude, view.longitude);

  return (
    <div className="flex flex-col gap-4 p-6">
      <BackLink />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold leading-tight">Reporte {view.reportNumber}</h1>
          <CategoryPill category={view.category} />
          <StatusBadge status={view.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr_380px]">
        {/* Panel izquierdo */}
        <section className="flex flex-col gap-4">
          <div className={card}>
            {view.photoUrl ? (
              <button type="button" onClick={() => setPhotoOpen(true)} className="block w-full" aria-label="Ampliar foto">
                <img
                  src={view.photoUrl}
                  alt={`Foto del reporte ${view.reportNumber}`}
                  className="h-52 w-full rounded-t-lg object-cover"
                />
              </button>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-t-lg bg-base text-sm text-typography-muted">
                <ImageOff size={20} strokeWidth={ICON_STROKE} />
                Sin fotografía
              </div>
            )}
            <dl className="flex flex-col gap-3 p-4 text-sm">
              <InfoRow icon={MapPin} label="Ubicación">
                {address.label}
                {address.showCoordinates && (
                  <span className="block text-xs text-typography-muted">
                    {formatCoordinates(view.latitude, view.longitude)}
                  </span>
                )}
              </InfoRow>
              <InfoRow icon={Calendar} label="Fecha y hora">
                {formatDateTime(view.createdAt)}
              </InfoRow>
            </dl>
          </div>

          <div className={`${card} p-4`}>
            <h2 className="mb-2 text-[16px] font-semibold">Comentario del ciudadano</h2>
            {adminItem.isLoading ? (
              <LoadingSkeleton lines={2} />
            ) : (
              <p className="text-sm leading-relaxed">
                {a ? a.citizen_comment || <Muted>Sin comentario.</Muted> : <Muted>No disponible.</Muted>}
              </p>
            )}
          </div>

          <div className={`${card} p-4`}>
            <h2 className="mb-3 text-[16px] font-semibold">Ciudadano</h2>
            {adminItem.isLoading ? (
              <LoadingSkeleton lines={2} />
            ) : a ? (
              <dl className="flex flex-col gap-3 text-sm">
                <InfoRow icon={UserRound} label="Nombre">
                  {a.citizen.full_name}
                </InfoRow>
                <InfoRow icon={Phone} label="Teléfono">
                  {a.citizen.phone_number ? (
                    <a href={`tel:${a.citizen.phone_number}`} className="font-medium text-brand hover:text-brand-dark">
                      {a.citizen.phone_number}
                    </a>
                  ) : (
                    <Muted>Sin teléfono.</Muted>
                  )}
                </InfoRow>
              </dl>
            ) : (
              <Muted>No disponible.</Muted>
            )}
          </div>
        </section>

        {/* Panel central: mapa */}
        <section className={`${card} h-[420px] overflow-hidden xl:h-auto xl:min-h-[560px]`}>
          <AdminMap
            showIncidents={false}
            showClusters={false}
            focus={{
              longitude: view.longitude,
              latitude: view.latitude,
              zoom: 14,
              color: CATEGORIES[view.category].color,
            }}
          />
        </section>

        {/* Panel derecho: acciones y trazabilidad */}
        <section className="flex flex-col gap-4">
          <Button
            variant="primary"
            className="w-full"
            icon={<RefreshCw size={18} strokeWidth={2} />}
            onClick={() => setStatusOpen(true)}
            disabled={!lastEvent && history.isLoading}
          >
            Actualizar estado
          </Button>

          <div className={`${card} p-4`}>
            <h2 className="mb-4 flex items-center gap-2 text-[16px] font-semibold">
              <History size={20} strokeWidth={ICON_STROKE} className="text-typography-muted" />
              Historial
            </h2>
            {history.isLoading ? (
              <LoadingSkeleton lines={5} />
            ) : history.error ? (
              <p className="text-sm text-brand-dark">{history.error.message}</p>
            ) : (
              <AuditTimeline history={events} />
            )}
          </div>
        </section>
      </div>

      <StatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        reportId={view.id}
        reportNumber={view.reportNumber}
        currentStatus={view.status}
      />

      {view.photoUrl && (
        <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title={`Foto · ${view.reportNumber}`} className="max-w-4xl">
          <img src={view.photoUrl} alt={`Foto del reporte ${view.reportNumber}`} className="max-h-[75vh] w-full rounded object-contain" />
        </Modal>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/reports"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-typography-muted transition-colors duration-150 ease-out hover:text-typography-main"
    >
      <ArrowLeft size={16} strokeWidth={2} />
      Reportes
    </Link>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon size={18} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0 text-typography-muted" />
      <div>
        <dt className="text-xs font-medium text-typography-muted">{label}</dt>
        <dd className="text-typography-main">{children}</dd>
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-typography-muted">{children}</span>;
}
