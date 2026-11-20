import { describe, expect, it } from 'vitest';
import { addressDisplay } from '../utils/address';

describe('addressDisplay', () => {
  it('referencia geocodificada: texto del backend y coordenadas aparte', () => {
    expect(addressDisplay('Av. 25 de Mayo y Calle Fontana, Formosa Capital', -26.1852, -58.1738)).toEqual({
      label: 'Av. 25 de Mayo y Calle Fontana, Formosa Capital',
      showCoordinates: true,
    });
  });

  it('referencia sintética del backend: no repite las coordenadas', () => {
    expect(addressDisplay('Coordenadas: [-25.0550, -60.0930], Formosa', -25.055, -60.093)).toEqual({
      label: 'Coordenadas: [-25.0550, -60.0930], Formosa',
      showCoordinates: false,
    });
  });

  it('formato sintético alternativo de 03 §4.2', () => {
    expect(addressDisplay('Ubicación Formosa (-26.1852, -58.1738)', -26.1852, -58.1738).showCoordinates).toBe(false);
  });

  it('referencia vacía: muestra las coordenadas', () => {
    expect(addressDisplay('  ', -25.055, -60.093)).toEqual({ label: '(-25.0550, -60.0930)', showCoordinates: false });
    expect(addressDisplay(undefined, -25.055, -60.093).label).toBe('(-25.0550, -60.0930)');
  });
});
