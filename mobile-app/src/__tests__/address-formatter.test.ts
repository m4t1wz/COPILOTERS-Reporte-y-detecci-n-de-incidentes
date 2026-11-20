import { coordinatesFallback, formatGeocodedAddress } from '../utils/address-formatter';

const LAT = -26.1852;
const LON = -58.1738;

describe('formatGeocodedAddress', () => {
  it('zona urbana: calle con número, localidad y provincia', () => {
    expect(
      formatGeocodedAddress(
        { street: 'Av. 25 de Mayo', streetNumber: '540', name: '540', city: 'Formosa', region: 'Formosa' },
        LAT,
        LON
      )
    ).toBe('Av. 25 de Mayo 540, Formosa');
  });

  it('usa el departamento cuando falta la ciudad (puntos rurales)', () => {
    expect(
      formatGeocodedAddress({ street: null, city: null, subregion: 'Departamento Pilcomayo', region: 'Formosa' }, LAT, LON)
    ).toBe('Departamento Pilcomayo, Formosa');
  });

  it('usa `name` como referencia si no hay calle y no repite otro campo', () => {
    expect(
      formatGeocodedAddress({ name: 'Ruta Provincial 2', city: 'Laguna Blanca', region: 'Formosa' }, LAT, LON)
    ).toBe('Ruta Provincial 2, Laguna Blanca, Formosa');
  });

  it('incluye barrio y evita duplicados', () => {
    expect(
      formatGeocodedAddress({ street: 'Fontana', district: 'San Miguel', city: 'Formosa', region: 'formosa' }, LAT, LON)
    ).toBe('Fontana, San Miguel, Formosa');
  });

  it('solo provincia: agrega coordenadas', () => {
    expect(formatGeocodedAddress({ region: 'Formosa' }, LAT, LON)).toBe(`${coordinatesFallback(LAT, LON)}, Formosa`);
  });

  it('sin resultado: coordenadas', () => {
    expect(formatGeocodedAddress(undefined, LAT, LON)).toBe('Coordenadas: (-26.1852, -58.1738)');
    expect(formatGeocodedAddress({}, LAT, LON)).toBe('Coordenadas: (-26.1852, -58.1738)');
  });
});
