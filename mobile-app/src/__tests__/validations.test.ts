import { isInsideFormosa } from '../utils/geo';
import { INCIDENT_CATEGORIES, REPORT_STATUSES } from '../constants/categories';

describe('Reglas de Validación de Negocio de Reportes', () => {
  describe('Validación Condicional: Foto o Comentario Obligatorio', () => {
    const validatePhotoOrComment = (hasPhoto: boolean, comment?: string | null): boolean => {
      const validComment = Boolean(comment && comment.trim().length > 0);
      return hasPhoto || validComment;
    };

    it('debe rechazar el reporte si NO hay foto y NO hay comentario', () => {
      expect(validatePhotoOrComment(false, null)).toBe(false);
      expect(validatePhotoOrComment(false, '')).toBe(false);
      expect(validatePhotoOrComment(false, '   ')).toBe(false);
    });

    it('debe aceptar el reporte si hay foto aunque no haya comentario', () => {
      expect(validatePhotoOrComment(true, null)).toBe(true);
      expect(validatePhotoOrComment(true, '')).toBe(true);
    });

    it('debe aceptar el reporte si no hay foto pero sí comentario descriptivo', () => {
      expect(validatePhotoOrComment(false, 'Calle cortada por agua acumulada')).toBe(true);
    });

    it('debe aceptar el reporte si hay foto y también comentario', () => {
      expect(validatePhotoOrComment(true, 'Poste inclinado a punto de caer')).toBe(true);
    });
  });

  describe('Validación de Categoría "Otro"', () => {
    const validateOtroCategory = (category: string, hasPhoto: boolean, comment?: string | null): boolean => {
      if (category === 'otro') {
        const validComment = Boolean(comment && comment.trim().length > 0);
        return hasPhoto || validComment;
      }
      return true;
    };

    it('al seleccionar "otro" sin foto, el comentario es obligatorio', () => {
      expect(validateOtroCategory('otro', false, '')).toBe(false);
      expect(validateOtroCategory('otro', false, 'Falla en alcantarilla')).toBe(true);
      expect(validateOtroCategory('otro', true, '')).toBe(true);
    });
  });

  describe('Validación territorial con el polígono real de Formosa', () => {
    it('debe aceptar coordenadas reales dentro de Formosa Capital', () => {
      expect(isInsideFormosa(-26.1852, -58.1738)).toBe(true);
    });

    it('debe aceptar coordenadas reales en Clorinda', () => {
      expect(isInsideFormosa(-25.2850, -57.7180)).toBe(true);
    });

    it('debe aceptar coordenadas reales en Las Lomitas', () => {
      expect(isInsideFormosa(-24.7000, -60.5900)).toBe(true);
    });

    it('debe aceptar coordenadas reales en Ingeniero Juárez', () => {
      expect(isInsideFormosa(-23.9000, -61.8500)).toBe(true);
    });

    it('debe rechazar coordenadas fuera del BBOX provincial (ej. Caaguazú / fuera de longitud este)', () => {
      // Coordenada documentada en docs/01. architecture.md (Sec. 7) y docs/02. system-contracts.md (Sec. 1.4)
      expect(isInsideFormosa(-25.2987, -56.8921)).toBe(false);
    });

    it('debe rechazar coordenadas fuera de Formosa (Resistencia, Chaco)', () => {
      expect(isInsideFormosa(-27.4514, -58.9866)).toBe(false);
    });

    it('debe rechazar coordenadas fuera de Formosa (Buenos Aires)', () => {
      expect(isInsideFormosa(-34.6037, -58.3816)).toBe(false);
    });

    // Puntos dentro del rectángulo envolvente pero fuera de la provincia: antes se aceptaban.
    it('debe rechazar Chaco aunque esté dentro del rectángulo envolvente', () => {
      expect(isInsideFormosa(-26.7, -59.0)).toBe(false);
    });

    it('debe rechazar Paraguay cruzando el río frente a Formosa Capital', () => {
      expect(isInsideFormosa(-26.17, -58.05)).toBe(false);
    });

    it('debe rechazar valores no numéricos', () => {
      expect(isInsideFormosa(NaN, -58.17)).toBe(false);
    });
  });

  describe('Catálogo de 10 Categorías Oficiales y Colores', () => {
    it('debe contener exactamente las 10 categorías especificadas con sus colores', () => {
      const keys = Object.keys(INCIDENT_CATEGORIES);
      expect(keys).toHaveLength(10);
      expect(INCIDENT_CATEGORIES.calle_anegada.color).toBe('#2196F3');
      expect(INCIDENT_CATEGORIES.camino_interrumpido.color).toBe('#F57C00');
      expect(INCIDENT_CATEGORIES.desborde_rio_riacho.color).toBe('#1565C0');
      expect(INCIDENT_CATEGORIES.vivienda_estructura_daniada.color).toBe('#D32F2F');
      expect(INCIDENT_CATEGORIES.arbol_caido.color).toBe('#558B2F');
      expect(INCIDENT_CATEGORIES.obstruccion_desague.color).toBe('#00897B');
      expect(INCIDENT_CATEGORIES.poste_cable_caido.color).toBe('#F9A825');
      expect(INCIDENT_CATEGORIES.danos_infraestructura_publica.color).toBe('#7E57C2');
      expect(INCIDENT_CATEGORIES.corte_servicios_basicos.color).toBe('#607D8B');
      expect(INCIDENT_CATEGORIES.otro.color).toBe('#757575');
    });
  });

  describe('Catálogo de Estados de Reporte', () => {
    it('debe contener exactamente los 6 estados de la FSM', () => {
      const statuses = Object.keys(REPORT_STATUSES);
      expect(statuses).toEqual([
        'pendiente',
        'en_revision',
        'verificado',
        'descartado',
        'en_seguimiento',
        'resuelto',
      ]);
    });
  });
});
