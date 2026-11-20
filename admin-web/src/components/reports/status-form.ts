// Validación del formulario de cambio de estado — 04. admin-web.md §6 · 02. system-contracts.md §6.
import { ADMIN_COMMENT_MAX, ADMIN_COMMENT_MIN, isTransitionAllowed } from '../../core/constants';
import type { ReportStatus, StatusUpdateRequest } from '../../types/report';

export const ADMIN_COMMENT_PLACEHOLDER =
  'Escriba las observaciones operativas que serán visibles para el ciudadano...';
export const NOTIFY_LABEL = 'Notificar al ciudadano sobre este cambio de estado';

export interface StatusFormValues {
  newStatus: ReportStatus | null;
  comment: string;
  notifyCitizen: boolean;
}

export interface StatusFormErrors {
  newStatus?: string;
  comment?: string;
}

export function validateStatusForm(current: ReportStatus, values: StatusFormValues): StatusFormErrors {
  const errors: StatusFormErrors = {};
  if (!values.newStatus) errors.newStatus = 'Seleccione el nuevo estado.';
  else if (!isTransitionAllowed(current, values.newStatus)) errors.newStatus = 'Transición de estado no permitida.';

  const length = values.comment.trim().length;
  if (length < ADMIN_COMMENT_MIN) errors.comment = `El comentario debe tener al menos ${ADMIN_COMMENT_MIN} caracteres.`;
  else if (length > ADMIN_COMMENT_MAX) errors.comment = `El comentario no puede superar los ${ADMIN_COMMENT_MAX} caracteres.`;
  return errors;
}

export function toStatusRequest(values: StatusFormValues): StatusUpdateRequest {
  return {
    new_status: values.newStatus!,
    admin_comment: values.comment.trim(),
    notify_citizen: values.notifyCitizen,
  };
}
