import { typography, FontSizePreference } from '../constants/typography';
import { theme } from '../constants/theme';

describe('Accesibilidad Universal y Escalas de Visualización', () => {
  describe('Escalado Dinámico de Fuente', () => {
    const computeScaledSize = (baseSize: number, pref: FontSizePreference): number => {
      const scale = typography.scaleFactors[pref] || 1.0;
      return Math.round(baseSize * scale);
    };

    it('escala Normal (100%) no altera los tamaños base', () => {
      expect(computeScaledSize(16, 'normal')).toBe(16);
      expect(computeScaledSize(22, 'normal')).toBe(22);
    });

    it('escala Grande (125%) incrementa en un cuarto el tamaño', () => {
      expect(computeScaledSize(16, 'large')).toBe(20);
      expect(computeScaledSize(20, 'large')).toBe(25);
    });

    it('escala Extra Grande (150%) incrementa a la mitad el tamaño', () => {
      expect(computeScaledSize(16, 'xlarge')).toBe(24);
      expect(computeScaledSize(20, 'xlarge')).toBe(30);
    });
  });

  describe('Tokens de Diseño y Colores Institucionales', () => {
    it('los colores institucionales provienen de la paleta del logo', () => {
      expect(theme.colors.primary).toBe('#0475EF');
      expect(theme.colors.primaryDark).toBe('#091B3B');
      expect(theme.colors.dark.primary).toBe('#3CD6FC');
    });

    it('contraste del color principal: AA de componentes (3:1) en claro y AA de texto (4.5:1) en oscuro', () => {
      const luminance = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
          c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      // #FFFFFF sobre #0475EF = 4.38:1 (texto semibold de botones; ver 08 §2.1).
      expect(contrast(theme.colors.onPrimary, theme.colors.primary)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.colors.dark.onPrimary, theme.colors.dark.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.dark.primary, theme.colors.dark.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('el fondo de superficie debe ser #FFFFFF y fondo base #F7F7F7', () => {
      expect(theme.colors.surface).toBe('#FFFFFF');
      expect(theme.colors.background).toBe('#F7F7F7');
    });

    it('el borde institucional debe ser #E8E5E5', () => {
      expect(theme.colors.border).toBe('#E8E5E5');
    });

    it('el radio del botón Informar debe ser 10px moderado', () => {
      expect(theme.radius.informarBtn).toBe(10);
    });

    it('el tamaño mínimo táctil debe ser al menos 56dp', () => {
      expect(theme.touchTarget.minSize).toBeGreaterThanOrEqual(56);
    });
  });
});
