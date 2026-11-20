import * as fs from 'fs';
import * as path from 'path';
import { theme } from '../constants/theme';

const SRC = path.join(__dirname, '..');

const listSources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

describe('Estética compartida con NEXO MAP Admin Web', () => {
  it('las micro-interacciones respetan los límites de 08 §6.2', () => {
    expect(theme.motion.press).toBeLessThanOrEqual(150);
    expect(theme.motion.fade).toBeLessThanOrEqual(150);
    expect(theme.motion.modal).toBeLessThanOrEqual(200);
  });

  it('el feedback táctil es por color, no por atenuación de opacidad', () => {
    for (const file of listSources(SRC)) {
      const code = fs.readFileSync(file, 'utf8');
      expect({ file, uses: /TouchableOpacity|activeOpacity/.test(code) }).toEqual({ file, uses: false });
    }
  });

  it('las paletas clara y oscura definen los mismos tokens', () => {
    const { dark, ...light } = theme.colors;
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });
});
