// Diálogo de cambio de estado y comentario administrativo — docs/tecnica/04. admin-web.md §6.
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ADMIN_COMMENT_MAX, STATUS_LABELS, getAllowedTransitions } from '../../core/constants';
import { useUpdateReportStatus } from '../../hooks/use-reports';
import type { ReportStatus } from '../../types/report';
import { cn } from '../../utils/cn';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import {
  ADMIN_COMMENT_PLACEHOLDER,
  NOTIFY_LABEL,
  toStatusRequest,
  validateStatusForm,
  type StatusFormErrors,
  type StatusFormValues,
} from './status-form';

interface StatusModalProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  reportNumber: string;
  currentStatus: ReportStatus;
}

const INITIAL: StatusFormValues = { newStatus: null, comment: '', notifyCitizen: true };

export function StatusModal({ open, onClose, reportId, reportNumber, currentStatus }: StatusModalProps) {
  const mutation = useUpdateReportStatus();
  const [values, setValues] = useState<StatusFormValues>(INITIAL);
  const [errors, setErrors] = useState<StatusFormErrors>({});
  const options = getAllowedTransitions(currentStatus);

  const resetMutation = mutation.reset;
  useEffect(() => {
    if (open) {
      setValues(INITIAL);
      setErrors({});
      resetMutation();
    }
  }, [open, resetMutation]);

  const submit = () => {
    const found = validateStatusForm(currentStatus, values);
    setErrors(found);
    if (Object.keys(found).length) return;
    mutation.mutate(
      { id: reportId, body: toStatusRequest(values) },
      {
        onSuccess: (res) => {
          toast.success(`Reporte ${res.report_number}: estado actualizado a ${STATUS_LABELS[res.current_status]}`);
          onClose();
        },
      },
    );
  };

  const length = values.comment.trim().length;

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => {} : onClose}
      title={`Actualizar estado · ${reportNumber}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={mutation.isPending} disabled={options.length === 0}>
            Actualizar estado
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-typography-muted">Estado actual</span>
          <StatusBadge status={currentStatus} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Nuevo estado</legend>
          {options.length === 0 ? (
            <p className="text-sm text-typography-muted">Estado final: no admite nuevas transiciones.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options.map((status) => {
                const selected = values.newStatus === status;
                return (
                  <label
                    key={status}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-btn border px-3 py-2 transition-colors duration-150 ease-out',
                      selected ? 'border-brand bg-brand-soft' : 'border-border bg-surface hover:bg-brand-soft/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="new_status"
                      value={status}
                      checked={selected}
                      onChange={() => setValues((v) => ({ ...v, newStatus: status }))}
                      className="accent-brand"
                    />
                    <StatusBadge status={status} className="border-0 bg-transparent px-0" />
                  </label>
                );
              })}
            </div>
          )}
          {errors.newStatus && <FieldError message={errors.newStatus} />}
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Comentario administrativo</span>
          <textarea
            rows={5}
            maxLength={ADMIN_COMMENT_MAX}
            placeholder={ADMIN_COMMENT_PLACEHOLDER}
            value={values.comment}
            onChange={(e) => setValues((v) => ({ ...v, comment: e.target.value }))}
            className={cn(
              'w-full resize-y rounded-field border bg-surface px-3 py-2 text-sm leading-relaxed text-typography-main placeholder:text-typography-muted focus:outline-none focus:ring-2',
              errors.comment ? 'border-brand focus:ring-brand/30' : 'border-border focus:border-brand focus:ring-brand/20',
            )}
          />
          <div className="flex items-start justify-between gap-2">
            {errors.comment ? <FieldError message={errors.comment} /> : <span />}
            <span className="shrink-0 text-xs text-typography-muted">
              {length}/{ADMIN_COMMENT_MAX}
            </span>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.notifyCitizen}
            onChange={(e) => setValues((v) => ({ ...v, notifyCitizen: e.target.checked }))}
            className="h-4 w-4 accent-brand"
          />
          {NOTIFY_LABEL}
        </label>

        {mutation.error && (
          <div role="alert" className="flex items-start gap-2 rounded-field border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-dark">
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>{mutation.error.message}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="text-xs font-medium text-brand-dark">{message}</span>;
}
