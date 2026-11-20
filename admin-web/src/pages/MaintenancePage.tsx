// /mantenimiento — herramienta oculta para borrar datos de prueba (no figura en el menú; atajo Ctrl+Shift+M).
// docs/tecnica/04. admin-web.md §5.4 y 03. backend.md §4.7.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ICON_STROKE } from '../components/common/status-styles';
import { PageHeader } from '../components/layout/PageHeader';
import type { ApiError } from '../core/api-client';
import { CONFIRMATION_WORD, maintenanceService, type ResetResponse, type ResetScope } from '../services/maintenance-service';
import { cn } from '../utils/cn';

const OPTIONS: { scope: ResetScope; title: string; description: string }[] = [
  {
    scope: 'agrupaciones',
    title: 'Agrupaciones',
    description: 'Borra las zonas de concentración. Se vuelven a generar al verificar reportes.',
  },
  {
    scope: 'reportes',
    title: 'Reportes',
    description: 'Borra todos los reportes, su historial, sus fotos y las zonas. La numeración vuelve a #00001.',
  },
  {
    scope: 'cuentas',
    title: 'Cuentas',
    description: 'Borra todas las cuentas excepto la tuya, junto con los reportes que crearon.',
  },
  {
    scope: 'todo',
    title: 'Todo',
    description: 'Deja la base vacía: reportes, historial, fotos, zonas y todas las cuentas excepto la tuya.',
  },
];

const LABELS: Record<keyof ResetResponse['deleted'], string> = {
  reportes: 'Reportes',
  historial: 'Entradas de historial',
  agrupaciones: 'Zonas',
  fotos: 'Fotos',
  cuentas: 'Cuentas',
};

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ResetScope | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ResetResponse | null>(null);

  const mutation = useMutation<ResetResponse, ApiError>({
    mutationFn: () => maintenanceService.reset(scope!, confirmation),
    onSuccess: async (data) => {
      setResult(data);
      setConfirmation('');
      setConfirmOpen(false);
      await queryClient.invalidateQueries();
      toast.success('Datos borrados');
    },
    onError: () => setConfirmOpen(false),
  });

  const ready = scope !== null && confirmation.trim() === CONFIRMATION_WORD;
  const selected = OPTIONS.find((o) => o.scope === scope);
  const disabledOnServer = mutation.error?.status === 404;

  return (
    <div className="p-6">
      <PageHeader title="Mantenimiento" meta="Herramienta de pruebas: borra datos de forma definitiva." />

      <div className="flex max-w-2xl flex-col gap-4">
        <div className="flex items-start gap-2 rounded-field border border-[#D32F2F]/30 bg-[#FDECEC] px-3 py-2 text-sm text-[#B71C1C]">
          <AlertTriangle size={18} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0" />
          <span>El borrado no se puede deshacer. Tu cuenta de administrador nunca se borra.</span>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Qué borrar</legend>
          {OPTIONS.map((o) => (
            <label
              key={o.scope}
              className={cn(
                'flex cursor-pointer gap-3 rounded-card border bg-surface p-3 transition-colors duration-150 ease-out hover:bg-brand-soft/50',
                scope === o.scope ? 'border-brand' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="scope"
                value={o.scope}
                checked={scope === o.scope}
                onChange={() => setScope(o.scope)}
                className="mt-1 accent-[#D32F2F]"
              />
              <span>
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-sm text-typography-muted">{o.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            Para confirmar, escribí <strong className="font-semibold">{CONFIRMATION_WORD}</strong>
          </span>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            className="h-10 rounded-field border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          />
        </label>

        <div>
          <Button
            variant="primary"
            disabled={!ready}
            onClick={() => setConfirmOpen(true)}
            icon={<Trash2 size={16} strokeWidth={2} />}
            className="bg-[#D32F2F] hover:bg-[#B71C1C]"
          >
            Borrar
          </Button>
        </div>

        {mutation.error && (
          <p role="alert" className="text-sm text-[#B71C1C]">
            {disabledOnServer
              ? 'La herramienta está deshabilitada en el servidor (ENABLE_DATA_RESET=false).'
              : mutation.error.message}
          </p>
        )}

        {result && (
          <div className="rounded-card border border-border bg-surface p-4 text-sm">
            <p className="mb-2 font-semibold">Resultado ({OPTIONS.find((o) => o.scope === result.scope)?.title})</p>
            <ul className="grid grid-cols-2 gap-1">
              {(Object.keys(LABELS) as (keyof ResetResponse['deleted'])[]).map((key) => (
                <li key={key} className="flex justify-between gap-4 border-b border-border py-1">
                  <span className="text-typography-muted">{LABELS[key]}</span>
                  <span className="font-medium">{result.deleted[key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`Borrar: ${selected?.title ?? ''}`}
        confirmLabel="Borrar definitivamente"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p className="text-sm">{selected?.description} Esta acción no se puede deshacer.</p>
      </ConfirmModal>
    </div>
  );
}
