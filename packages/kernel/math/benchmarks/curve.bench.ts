import type { CurveSegment } from '@retikz/math';
import { curve } from '@retikz/math';
import { expect, test } from 'vitest';

import { sampling } from '../../../../scripts/benchmarks';

const fixtures: Array<{
  name: string;
  segment: CurveSegment;
  sampleCounts: Array<number>;
  minimum: number;
  maximum: number;
}> = [
  {
    name: 'line',
    segment: { kind: 'line', from: [0, 0], to: [3, 4] },
    sampleCounts: [32],
    minimum: 5,
    maximum: 5,
  },
  {
    name: 'arc',
    segment: { kind: 'arc', center: [0, 0], radius: 2, startAngleDeg: 0, endAngleDeg: 180 },
    sampleCounts: [32],
    minimum: 2 * Math.PI,
    maximum: 2 * Math.PI,
  },
  {
    name: 'cubic',
    segment: { kind: 'cubicBezier', from: [0, 0], control1: [0, 3], control2: [4, 3], to: [4, 0] },
    sampleCounts: [32, 128, 512],
    minimum: 4,
    maximum: 10,
  },
  {
    name: 'ellipse',
    segment: { kind: 'ellipseArc', center: [0, 0], radiusX: 3, radiusY: 2, startAngleDeg: 0, endAngleDeg: 180 },
    sampleCounts: [32, 128, 512],
    minimum: 6,
    maximum: 3 * Math.PI,
  },
];

for (const fixture of fixtures) {
  for (const sampleCount of fixture.sampleCounts) {
    test(`approximateLength/${fixture.name}/samples=${sampleCount}`, async ({ bench }) => {
      const approximateLength = curve.approximateLength;
      const options = { sampleCount };
      const original = structuredClone(fixture.segment);
      const expected = approximateLength(fixture.segment, options);
      expect(expected).toBeGreaterThanOrEqual(fixture.minimum);
      expect(expected).toBeLessThanOrEqual(fixture.maximum);
      let result = 0;

      await bench('approximateLength', () => {
        result = approximateLength(fixture.segment, options);
      }).run(sampling);

      expect(result).toBe(expected);
      expect(fixture.segment).toEqual(original);
    });
  }
}
