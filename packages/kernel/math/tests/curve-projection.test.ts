import { describe, expect, it } from 'vitest';

import { curve } from '../src';
import type { CurveSegment } from '../src';

describe('curve projected range', () => {
  it('uses quadratic interior extrema rather than control points', () => {
    expect(
      curve.projectedRange({ kind: 'quadraticBezier', from: [0, 0], control: [20, 10], to: [0, 20] }, [1, 0]),
    ).toEqual({ min: 0, max: 10 });
  });

  it('limits arc extrema to the authored sweep', () => {
    const range = curve.projectedRange(
      { kind: 'arc', center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 90 },
      [-1, 0],
    );

    expect(range.min).toBeCloseTo(-10);
    expect(range.max).toBeCloseTo(0);
  });
});

it('finds cubic extrema and handles zero projection axes', () => {
  const segment = {
    kind: 'cubicBezier',
    from: [0, 0],
    control1: [40, 0],
    control2: [40, 20],
    to: [0, 20],
  } satisfies CurveSegment;

  expect(curve.projectedRange(segment, [2, 0])).toEqual({ min: 0, max: 60 });
  expect(curve.projectedRange(segment, [0, 0])).toEqual({ min: 0, max: 0 });
});
it('finds rotated ellipse extrema in reverse sweeps', () => {
  const range = curve.projectedRange(
    {
      kind: 'ellipseArc',
      center: [3, 4],
      radiusX: 20,
      radiusY: 10,
      rotationDeg: 45,
      startAngleDeg: 360,
      endAngleDeg: 0,
    },
    [1, 0],
  );

  expect(range.min).toBeCloseTo(3 - Math.sqrt(250));
  expect(range.max).toBeCloseTo(3 + Math.sqrt(250));
});
