export interface GeocodedAddressParts {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
}

export const coordinatesFallback = (lat: number, lon: number): string =>
  `Coordenadas: (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

const clean = (value?: string | null): string => (value ?? '').trim();

// Android devuelve en `name` el número de puerta o una repetición de la calle; solo sirve si aporta algo nuevo.
const isUsefulName = (name: string, others: string[]): boolean =>
  name.length > 0 && !/^\d+[a-zA-Z]?$/.test(name) && !others.some((o) => o.toLowerCase().includes(name.toLowerCase()));

/** Arma una referencia legible desde el resultado de `reverseGeocodeAsync`, tolerando campos vacíos en zonas rurales. */
export const formatGeocodedAddress = (
  item: GeocodedAddressParts | null | undefined,
  lat: number,
  lon: number
): string => {
  if (!item) return coordinatesFallback(lat, lon);

  const street = clean(item.street);
  const number = clean(item.streetNumber);
  const streetLine = street ? (number ? `${street} ${number}` : street) : '';
  const locality = clean(item.city) || clean(item.subregion);
  const district = clean(item.district);
  const region = clean(item.region);

  const name = clean(item.name);
  const lead = streetLine || (isUsefulName(name, [locality, district, region]) ? name : '');

  const parts: string[] = [];
  for (const part of [lead, district, locality, region]) {
    if (part && !parts.some((p) => p.toLowerCase() === part.toLowerCase())) parts.push(part);
  }

  // Solo la provincia no permite ubicar el punto: se informan las coordenadas.
  if (parts.length === 0 || (parts.length === 1 && parts[0] === region)) {
    return region ? `${coordinatesFallback(lat, lon)}, ${region}` : coordinatesFallback(lat, lon);
  }
  return parts.join(', ');
};
