// Reglas del sistema visual verificables sobre el código fuente.
import { describe, expect, it } from 'vitest';
import { STATUS_KEYS } from '../core/constants';
import { STATUS_STYLES } from '../components/common/status-styles';

const sources = import.meta.glob('../**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const tsxSources = Object.entries(sources).filter(([path]) => path.endsWith('.tsx'));

describe('sistema visual', () => {
  it('todos los estados tienen icono y acento', () => {
    for (const s of STATUS_KEYS) {
      expect(STATUS_STYLES[s].icon).toBeTruthy();
      expect(STATUS_STYLES[s].accent).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('no hay emojis en el código fuente', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [path, code] of Object.entries(sources)) {
      expect(emoji.test(code), path).toBe(false);
    }
  });

  it('no se usan cápsulas rounded-full ni pesos fuera de 400/500/600', () => {
    for (const [path, code] of tsxSources) {
      expect(/\brounded-full\b/.test(code), `${path}: rounded-full`).toBe(false);
      expect(/\bfont-(bold|extrabold|black|light|thin|extralight)\b/.test(code), `${path}: peso`).toBe(false);
    }
  });

  it('no se usa text-base (el token de color `base` #F7F7F7 lo vuelve invisible)', () => {
    for (const [path, code] of Object.entries(sources)) {
      if (path.endsWith('ui-rules.test.ts')) continue;
      expect(/\btext-base\b/.test(code), path).toBe(false);
    }
  });

  it('la iconografía proviene solo de lucide-react', () => {
    for (const [path, code] of tsxSources) {
      expect(/from ['"](react-icons|@heroicons|@mui\/icons)/.test(code), path).toBe(false);
    }
  });
});
