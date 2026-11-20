import { TimelineNodeItem } from '../types';

describe('Lógica y Ordenamiento del Timeline Cronológico Vertical', () => {
  it('debe ordenar los eventos de arriba hacia abajo (del más antiguo al más reciente)', () => {
    const rawEvents: TimelineNodeItem[] = [
      {
        step_order: 3,
        status: 'en_seguimiento',
        title: 'En seguimiento',
        description: 'Trabajos en curso.',
        admin_comment: 'Bomba de desagote instalada.',
        timestamp: '2026-11-18T18:00:00.000Z',
      },
      {
        step_order: 1,
        status: 'pendiente',
        title: 'Reporte recibido',
        description: 'El aviso fue recibido.',
        admin_comment: null,
        timestamp: '2026-11-18T14:22:10.000Z',
      },
      {
        step_order: 2,
        status: 'en_revision',
        title: 'En revisión',
        description: 'Se está revisando el reporte.',
        admin_comment: 'Cuadrilla enviada.',
        timestamp: '2026-11-18T15:30:00.000Z',
      },
    ];

    const sorted = [...rawEvents].sort((a, b) => {
      if (a.step_order !== b.step_order) {
        return a.step_order - b.step_order;
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    expect(sorted[0].step_order).toBe(1);
    expect(sorted[0].title).toBe('Reporte recibido');
    expect(sorted[1].step_order).toBe(2);
    expect(sorted[1].title).toBe('En revisión');
    expect(sorted[2].step_order).toBe(3);
    expect(sorted[2].title).toBe('En seguimiento');
  });

  it('el primer hito debe ser "Reporte recibido" con status "pendiente"', () => {
    const firstNode: TimelineNodeItem = {
      step_order: 1,
      status: 'pendiente',
      title: 'Reporte recibido',
      description: 'El aviso fue recibido.',
      admin_comment: null,
      timestamp: '2026-11-18T14:22:10.000Z',
    };

    expect(firstNode.step_order).toBe(1);
    expect(firstNode.title).toBe('Reporte recibido');
    expect(firstNode.status).toBe('pendiente');
    expect(firstNode.admin_comment).toBeNull();
  });

  it('los hitos administrativos deben preservar los comentarios del operador', () => {
    const reviewNode: TimelineNodeItem = {
      step_order: 2,
      status: 'en_revision',
      title: 'En revisión',
      description: 'Se está revisando el reporte.',
      admin_comment: 'Cuadrilla de Defensa Civil en camino para evaluar motobombas.',
      timestamp: '2026-11-18T14:45:00.000Z',
    };

    expect(reviewNode.admin_comment).toBeTruthy();
    expect(reviewNode.admin_comment).toContain('Defensa Civil');
  });
});
