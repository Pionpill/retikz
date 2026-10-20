import type { Position } from '@retikz/math';
import { convexHull } from '@retikz/math';
import { expect, test } from 'vitest';

import { sampling } from '../../../../scripts/benchmarks';

for (const count of [32, 256, 2048]) {
  const corners: Array<Position> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const cloud: Array<Position> = [
    ...corners,
    ...Array.from({ length: count - 4 }, (_, index): Position => [
      ((index * 137 + 17) % 997) / 500 - 0.996,
      ((index * 313 + 71) % 991) / 500 - 0.99,
    ]),
  ];
  const ring = Array.from({ length: count }, (_, index): Position => {
    const angle = (index * 2 * Math.PI) / count;
    return [Math.cos(angle), Math.sin(angle)];
  });
  const collinear = Array.from({ length: count }, (_, index): Position => {
    const x = (index * 17) % (count / 2);
    return [x, x];
  });

  for (const fixture of [
    { name: 'cloud', points: cloud, expectedCount: 4 },
    { name: 'ring', points: ring, expectedCount: count },
    { name: 'collinear-duplicates', points: collinear, expectedCount: 2 },
  ]) {
    test(`convexHull/${fixture.name}/points=${count}`, async ({ bench }) => {
      const computeHull = convexHull;
      const original = structuredClone(fixture.points);
      const expected = computeHull(fixture.points);
      let result = expected;
      expect(result).toHaveLength(fixture.expectedCount);
      if (fixture.name === 'cloud') expect(result).toEqual(corners);
      if (fixture.name === 'collinear-duplicates') {
        expect(result).toEqual([
          [0, 0],
          [count / 2 - 1, count / 2 - 1],
        ]);
      }

      await bench('convexHull', () => {
        result = computeHull(fixture.points);
      }).run(sampling);

      expect(result).toEqual(expected);
      expect(fixture.points).toEqual(original);
    });
  }
}
