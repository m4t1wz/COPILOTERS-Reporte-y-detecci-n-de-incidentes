import { describe, expect, it } from 'vitest';
import { historyTitle, sortHistory } from '../components/reports/AuditTimeline';
import {
  ADMIN_COMMENT_PLACEHOLDER,
  NOTIFY_LABEL,
  toStatusRequest,
  validateStatusForm,
} from '../components/reports/status-form';
import type { HistoryItem } from '../types/report';

describe('formulario de estado (04 §6)', () => {
  it('textos exactos de la especificación', () => {
    expect(ADMIN_COMMENT_PLACEHOLDER).toBe(
      'Escriba las observaciones operativas que serán visibles para el ciudadano...',
    );
    expect(NOTIFY_LABEL).toBe('Notificar al ciudadano sobre este cambio de estado');
  });

  it('exige estado y comentario de 5 a 1000 caracteres', () => {
    expect(validateStatusForm('pendiente', { newStatus: null, comment: '', notifyCitizen: true })).toEqual({
      newStatus: 'Seleccione el nuevo estado.',
      comment: 'El comentario debe tener al menos 5 caracteres.',
    });
    expect(
      validateStatusForm('pendiente', { newStatus: 'en_revision', comment: 'x'.repeat(1001), notifyCitizen: true })
        .comment,
    ).toMatch(/1000/);
    expect(
      validateStatusForm('pendiente', { newStatus: 'en_revision', comment: '  Cuadrilla enviada  ', notifyCitizen: true }),
    ).toEqual({});
  });

  it('rechaza transiciones fuera de la FSM', () => {
    expect(
      validateStatusForm('pendiente', { newStatus: 'resuelto', comment: 'Cierre directo', notifyCitizen: true }).newStatus,
    ).toBe('Transición de estado no permitida.');
  });

  it('arma el cuerpo del PATCH', () => {
    expect(toStatusRequest({ newStatus: 'verificado', comment: ' Confirmado. ', notifyCitizen: false })).toEqual({
      new_status: 'verificado',
      admin_comment: 'Confirmado.',
      notify_citizen: false,
    });
  });
});

describe('AuditTimeline', () => {
  const base = { admin_comment: null, changed_by: { user_id: 'u', role: 'admin' as const, name: 'Op' } };
  const items: HistoryItem[] = [
    { ...base, id: '2', previous_status: 'pendiente', new_status: 'en_revision', created_at: '2026-11-18T14:45:00.000Z' },
    { ...base, id: '1', previous_status: null, new_status: 'pendiente', created_at: '2026-11-18T14:22:10.000Z' },
  ];
  it('ordena del más antiguo al más reciente', () => {
    expect(sortHistory(items).map((i) => i.id)).toEqual(['1', '2']);
  });
  it('títulos de los hitos', () => {
    const [first, second] = sortHistory(items);
    expect(historyTitle(first)).toBe('Reporte recibido');
    expect(historyTitle(second)).toBe('En revisión');
  });
});
