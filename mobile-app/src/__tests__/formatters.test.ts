import { formatArgentinaDate } from '../utils/date-formatter';

describe('Formateadores de Presentación Visual', () => {
  describe('Formateador de Fechas a Hora Oficial Argentina (UTC-3)', () => {
    it('debe transformar timestamp UTC a formato DD/MM/AAAA (HH:MM)', () => {
      // 2026-11-18T17:22:10.000Z en UTC equivale a 14:22 en UTC-3
      const formatted = formatArgentinaDate('2026-11-18T17:22:10.000Z');
      expect(formatted).toBe('18/11/2026 (14:22)');
    });

    it('debe manejar cambio de día entre UTC y UTC-3', () => {
      // 2026-11-19T01:30:00.000Z en UTC equivale a 22:30 del 18/11/2026 en UTC-3
      const formatted = formatArgentinaDate('2026-11-19T01:30:00.000Z');
      expect(formatted).toBe('18/11/2026 (22:30)');
    });

    it('debe manejar cadenas inválidas o nulas retornando fallback limpio', () => {
      expect(formatArgentinaDate(null)).toBe('--/--/---- (--:--)');
      expect(formatArgentinaDate(undefined)).toBe('--/--/---- (--:--)');
      expect(formatArgentinaDate('fecha-invalida')).toBe('--/--/---- (--:--)');
    });
  });

  describe('Formato de Número de Reporte Amigable (#00000)', () => {
    const formatReportNumber = (num: number): string => {
      return `#${String(num).padStart(5, '0')}`;
    };

    it('debe rellenar con ceros a 5 dígitos con almohadilla', () => {
      expect(formatReportNumber(1)).toBe('#00001');
      expect(formatReportNumber(142)).toBe('#00142');
      expect(formatReportNumber(99999)).toBe('#99999');
    });
  });
});
