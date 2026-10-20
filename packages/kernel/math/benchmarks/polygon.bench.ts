import type { Position } from '@retikz/math';
import { polygon } from '@retikz/math';
import { expect, test } from 'vitest';

import { sampling } from '../../../../scripts/benchmarks';

for (const count of [16, 128, 1024]) {
  const vertices = Array.from({ length: count }, (_, index): Position => {
    const angle = (index * 2 * Math.PI) / count;
    return [Math.cos(angle), Math.sin(angle)];
  });
  const queries: Array<{ name: string; point: Position; expected: boolean }> = [
    { name: 'inside', point: [0.125, 0.125], expected: true },
    { name: 'outside', point: [2, 0.125], expected: false },
  ];

  for (const query of queries) {
    test(`containsPoint/${query.name}/vertices=${count}`, async ({ bench }) => {
      const containsPoint = polygon.containsPoint;
      const original = structuredClone(vertices);
      let result = containsPoint(vertices, query.point);
      expect(result).toBe(query.expected);

      await bench('containsPoint', () => {
        result = containsPoint(vertices, query.point);
      }).run(sampling);

      expect(result).toBe(query.expected);
      expect(vertices).toEqual(original);
    });
  }
}
