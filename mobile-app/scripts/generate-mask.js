const fs = require('fs');
const path = require('path');

const inputPath = path.resolve(__dirname, '../../backend/data/formosa.json');
const outputDir = path.resolve(__dirname, '../assets/geo');
const outputPath = path.join(outputDir, 'formosa-mask.json');

console.log('Reading formosa.json from:', inputPath);
const rawData = fs.readFileSync(inputPath, 'utf8');
const formosaGeoJson = JSON.parse(rawData);

let formosaCoords = null;
if (formosaGeoJson.type === 'FeatureCollection' && formosaGeoJson.features && formosaGeoJson.features.length > 0) {
  formosaCoords = formosaGeoJson.features[0].geometry.coordinates;
} else if (formosaGeoJson.type === 'Feature') {
  formosaCoords = formosaGeoJson.geometry.coordinates;
} else if (formosaGeoJson.type === 'Polygon') {
  formosaCoords = formosaGeoJson.coordinates;
}

if (!formosaCoords || !Array.isArray(formosaCoords)) {
  console.error('Could not find polygon coordinates in formosa.json');
  process.exit(1);
}

// In GeoJSON (RFC 7946):
// Polygon exterior ring must be Counter-Clockwise (CCW).
// Polygon interior rings (holes) must be Clockwise (CW).
function isClockwise(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i+1][0] - ring[i][0]) * (ring[i+1][1] + ring[i][1]);
  }
  return sum > 0;
}

let formosaRing = formosaCoords[0];
console.log(`Extracted Formosa boundary ring with ${formosaRing.length} vertices.`);

// Ensure hole is Clockwise
if (!isClockwise(formosaRing)) {
  console.log('Reversing Formosa ring to ensure Clockwise winding order for hole...');
  formosaRing = formosaRing.slice().reverse();
}

// Outer world ring (Counter-Clockwise: -180,-90 -> 180,-90 -> 180,90 -> -180,90 -> -180,-90)
const worldRing = [
  [-180.0, -90.0],
  [180.0, -90.0],
  [180.0, 90.0],
  [-180.0, 90.0],
  [-180.0, -90.0]
];

const maskGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        description: 'Máscara invertida exterior a la provincia de Formosa'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          worldRing,
          formosaRing
        ]
      }
    }
  ]
};

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(maskGeoJson));
console.log('Generated formosa-mask.json successfully at:', outputPath);
const stats = fs.statSync(outputPath);
console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
