import { describe, expect, it } from 'vitest';
import mask from '../../public/geo/formosa-mask.json';
import source from '../../../backend/data/formosa.json';

function signedArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return sum;
}

describe('formosa-mask.json', () => {
  const geometry = mask.features[0].geometry;
  const [outer, hole] = geometry.coordinates as number[][][];

  it('es un FeatureCollection con un Polygon de dos anillos', () => {
    expect(mask.type).toBe('FeatureCollection');
    expect(geometry.type).toBe('Polygon');
    expect(geometry.coordinates).toHaveLength(2);
  });

  it('el anillo exterior es mundial y antihorario', () => {
    expect(outer[0]).toEqual([-180, -90]);
    expect(outer[outer.length - 1]).toEqual(outer[0]);
    expect(signedArea(outer)).toBeLessThan(0);
  });

  it('el hueco conserva todos los vértices de Formosa en sentido horario', () => {
    const original = source.features[0].geometry.coordinates[0] as number[][];
    expect(hole).toHaveLength(original.length);
    expect(signedArea(hole)).toBeGreaterThan(0);
    const key = (p: number[]) => `${p[0]},${p[1]}`;
    const originalSet = new Set(original.map(key));
    expect(hole.every((p) => originalSet.has(key(p)))).toBe(true);
  });
});
