// Genera public/geo/formosa-mask.json: máscara invertida (anillo mundial con Formosa como hueco).
// Referencia: docs/tecnica/04. admin-web.md §4.2 · ADR-006.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(here, '../../backend/data/formosa.json');
const outputPath = resolve(here, '../public/geo/formosa-mask.json');

const source = JSON.parse(readFileSync(inputPath, 'utf8'));

function extractRing(geo) {
  if (geo.type === 'FeatureCollection') return extractRing(geo.features[0]);
  if (geo.type === 'Feature') return extractRing(geo.geometry);
  if (geo.type === 'Polygon') return geo.coordinates[0];
  throw new Error(`Geometría no soportada: ${geo.type}`);
}

// Suma de Shoelace: > 0 indica sentido horario (CW).
function isClockwise(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return sum > 0;
}

let formosaRing = extractRing(source);
if (!Array.isArray(formosaRing) || formosaRing.length < 4) {
  throw new Error('No se encontró el anillo del polígono de Formosa.');
}
// RFC 7946: los huecos van en sentido horario.
if (!isClockwise(formosaRing)) formosaRing = formosaRing.slice().reverse();

// Anillo exterior mundial en sentido antihorario.
const worldRing = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90],
];

const mask = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { description: 'Máscara invertida exterior a la provincia de Formosa' },
      geometry: { type: 'Polygon', coordinates: [worldRing, formosaRing] },
    },
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(mask));
console.log(`formosa-mask.json generado (${formosaRing.length} vértices en el hueco): ${outputPath}`);
