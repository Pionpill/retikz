import { describe, expect, it } from 'vitest';

import type { CubicSegment, CurveSegment, Position } from '../../src';

import { curve } from '../../src';

/** 一段所有坐标皆有限 */
const isCubicSegmentFinite = (segment: CubicSegment): boolean =>
  [segment.control1, segment.control2, segment.to].every(
    point => Number.isFinite(point[0]) && Number.isFinite(point[1]),
  );

describe('curve.catmullRomToCubic', () => {
  it('through-points：3 knot → 2 段，每段 .to 命中对应 knot', () => {
    const knots: Array<Position> = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const segments = curve.catmullRomToCubic(knots, 1);
    expect(segments).toHaveLength(knots.length - 1);
    expect(segments[0].to).toEqual(knots[1]);
    expect(segments[1].to).toEqual(knots[2]);
  });

  it('through-many-knots：5 knot → 4 段，每段 .to 命中对应 knot', () => {
    const knots: Array<Position> = [
      [0, 0],
      [10, 0],
      [10, 10],
      [20, 10],
      [20, 0],
    ];
    const segments = curve.catmullRomToCubic(knots, 1);
    expect(segments).toHaveLength(4);
    for (let index = 0; index < segments.length; index += 1) {
      expect(segments[index].to).toEqual(knots[index + 1]);
    }
  });

  it('tension 缩放控制点：tension=2 比 tension=1 控制点离端点更远，.to 不变', () => {
    const knots: Array<Position> = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const baseSegments = curve.catmullRomToCubic(knots, 1);
    const looseSegments = curve.catmullRomToCubic(knots, 2);

    for (let index = 0; index < baseSegments.length; index += 1) {
      expect(looseSegments[index].to).toEqual(baseSegments[index].to);
    }

    const distance = (a: Position, b: Position): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const baseFirstControlDistance = distance(baseSegments[0].control1, knots[0]);
    const looseFirstControlDistance = distance(looseSegments[0].control1, knots[0]);
    const baseSecondControlDistance = distance(baseSegments[0].control2, baseSegments[0].to);
    const looseSecondControlDistance = distance(looseSegments[0].control2, looseSegments[0].to);
    expect(looseFirstControlDistance).toBeGreaterThan(baseFirstControlDistance);
    expect(looseSecondControlDistance).toBeGreaterThan(baseSecondControlDistance);
  });

  it('退化：2 knot → 1 段，.to = knots[1]', () => {
    const knots: Array<Position> = [
      [0, 0],
      [4, 3],
    ];
    const segments = curve.catmullRomToCubic(knots, 1);
    expect(segments).toHaveLength(1);
    expect(segments[0].to).toEqual(knots[1]);
    expect(isCubicSegmentFinite(segments[0])).toBe(true);
  });

  it('centripetal 无 cusp：点距极不均时所有坐标有限（无 NaN/Infinity）', () => {
    const knots: Array<Position> = [
      [0, 0],
      [1, 0],
      [100, 0],
      [101, 5],
    ];
    const segments = curve.catmullRomToCubic(knots, 1);
    expect(segments).toHaveLength(3);
    for (const segment of segments) {
      expect(isCubicSegmentFinite(segment)).toBe(true);
    }
  });
});

describe('curve.sampleAt', () => {
  it('samples a line at a clamped parameter with a unit tangent', () => {
    const segment: CurveSegment = { kind: 'line', from: [0, 0], to: [12, 0] };

    expect(curve.sampleAt(segment, -1)).toEqual({ point: [0, 0], tangent: [1, 0] });
    expect(curve.sampleAt(segment, 0.5)).toEqual({ point: [6, 0], tangent: [1, 0] });
    expect(curve.sampleAt(segment, 2)).toEqual({ point: [12, 0], tangent: [1, 0] });
  });

  it('samples cubic Bezier geometry without exposing a Drawing command', () => {
    const segment: CurveSegment = {
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [0, 10],
      control2: [10, 10],
      to: [10, 0],
    };

    const sample = curve.sampleAt(segment, 0.5);

    expect(sample.point).toEqual([5, 7.5]);
    expect(sample.tangent[0]).toBeCloseTo(1, 12);
    expect(sample.tangent[1]).toBeCloseTo(0, 12);
  });

  it('samples quadratic Bezier endpoints and the derivative direction', () => {
    const segment: CurveSegment = {
      kind: 'quadraticBezier',
      from: [0, 0],
      control: [5, 10],
      to: [10, 0],
    };

    expect(curve.sampleAt(segment, 0).point).toEqual([0, 0]);
    expect(curve.sampleAt(segment, 1).point).toEqual([10, 0]);
    expect(curve.sampleAt(segment, 0.5).point).toEqual([5, 5]);
    expect(curve.sampleAt(segment, 0).tangent[0]).toBeCloseTo(1 / Math.sqrt(5), 12);
    expect(curve.sampleAt(segment, 0).tangent[1]).toBeCloseTo(2 / Math.sqrt(5), 12);
  });

  it('respects an ellipse arc rotation and its directed sweep', () => {
    const segment: CurveSegment = {
      kind: 'ellipseArc',
      center: [0, 0],
      radiusX: 10,
      radiusY: 4,
      rotationDeg: 90,
      startAngleDeg: 0,
      endAngleDeg: 90,
    };

    const start = curve.sampleAt(segment, 0);
    const middle = curve.sampleAt(segment, 0.5);

    expect(start.point[0]).toBeCloseTo(0, 12);
    expect(start.point[1]).toBeCloseTo(10, 12);
    expect(middle.point[0]).toBeCloseTo(-Math.SQRT2 * 2, 12);
    expect(middle.point[1]).toBeCloseTo(Math.SQRT2 * 5, 12);
    expect(start.tangent[0]).toBeCloseTo(-1, 12);
    expect(start.tangent[1]).toBeCloseTo(0, 12);
  });

  it('uses the directed circular-arc tangent at its start parameter', () => {
    const sample = curve.sampleAt({ kind: 'arc', center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: -90 }, 0);

    expect(sample.point).toEqual([10, 0]);
    expect(sample.tangent[0]).toBeCloseTo(0, 12);
    expect(sample.tangent[1]).toBeCloseTo(-1, 12);
  });

  it('uses a stable fallback tangent for a zero-length line', () => {
    const sample = curve.sampleAt({ kind: 'line', from: [3, 4], to: [3, 4] }, 0.5);

    expect(sample).toEqual({ point: [3, 4], tangent: [1, 0] });
  });
});

describe('curve.parameterAtDistance', () => {
  it('inverts a known line distance and preserves a caller-supplied total length', () => {
    const segment: CurveSegment = { kind: 'line', from: [0, 0], to: [20, 0] };

    expect(curve.approximateLength(segment)).toBe(20);
    expect(curve.parameterAtDistance(segment, 5)).toBe(0.25);
    expect(curve.parameterAtDistance(segment, 15, { totalLength: 20 })).toBe(0.75);
  });

  it('maps a symmetric cubic half-length back near its middle parameter', () => {
    const segment: CurveSegment = {
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [0, 10],
      control2: [10, 10],
      to: [10, 0],
    };
    const length = curve.approximateLength(segment);

    expect(curve.parameterAtDistance(segment, length / 2, { totalLength: length })).toBeCloseTo(0.5, 4);
  });

  it('returns an exactly matching sampled cubic midpoint before the bisection limit', () => {
    const segment: CurveSegment = {
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [0, 10],
      control2: [10, 10],
      to: [10, 0],
    };
    const totalLength = curve.approximateLength(segment);

    expect(curve.parameterAtDistance(segment, totalLength / 2, { totalLength, bisectionSteps: 1 })).toBe(0.5);
  });

  it('continues bracketing when a sampled cubic midpoint has a material distance residual', () => {
    const segment: CurveSegment = {
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [0, 10],
      control2: [10, 10],
      to: [10, 0],
    };
    const totalLength = curve.approximateLength(segment);

    expect(curve.parameterAtDistance(segment, totalLength / 4, { totalLength, bisectionSteps: 1 })).toBe(0.25);
  });

  it('uses the same fixed approximation model for a rotated elliptical arc', () => {
    const segment: CurveSegment = {
      kind: 'ellipseArc',
      center: [0, 0],
      radiusX: 20,
      radiusY: 8,
      rotationDeg: 25,
      startAngleDeg: 0,
      endAngleDeg: 180,
    };
    const length = curve.approximateLength(segment, { sampleCount: 48 });

    expect(curve.parameterAtDistance(segment, length / 2, { sampleCount: 48, totalLength: length })).toBeCloseTo(
      0.5,
      4,
    );
  });

  it('returns the start parameter for a zero-length segment', () => {
    expect(curve.parameterAtDistance({ kind: 'line', from: [1, 1], to: [1, 1] }, 3)).toBe(0);
  });
});

describe('curve.slice', () => {
  it('uses De Casteljau and preserves a cubic Bezier segment', () => {
    const segment: CurveSegment = {
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [0, 10],
      control2: [10, 10],
      to: [10, 0],
    };
    const sliced = curve.slice(segment, 0.25, 0.75);

    expect(sliced.kind).toBe('cubicBezier');
    if (sliced.kind !== 'cubicBezier') throw new Error('Expected a cubic Bezier slice.');
    expect(sliced.from).toEqual(curve.sampleAt(segment, 0.25).point);
    expect(sliced.to).toEqual(curve.sampleAt(segment, 0.75).point);
  });

  it('keeps the directed arc kind and limits its sweep to the selected range', () => {
    const segment: CurveSegment = {
      kind: 'arc',
      center: [0, 0],
      radius: 10,
      startAngleDeg: 0,
      endAngleDeg: 90,
    };
    const sliced = curve.slice(segment, 0.25, 0.75);

    expect(sliced).toMatchObject({
      kind: 'arc',
      center: [0, 0],
      radius: 10,
      startAngleDeg: 22.5,
      endAngleDeg: 67.5,
    });
  });

  it('preserves a rotated ellipse arc and its directed selected sweep', () => {
    const segment: CurveSegment = {
      kind: 'ellipseArc',
      center: [3, -2],
      radiusX: 10,
      radiusY: 4,
      rotationDeg: 30,
      startAngleDeg: 0,
      endAngleDeg: -180,
    };
    const sliced = curve.slice(segment, 0.25, 0.75);

    expect(sliced).toMatchObject({
      kind: 'ellipseArc',
      center: [3, -2],
      radiusX: 10,
      radiusY: 4,
      rotationDeg: 30,
      startAngleDeg: -45,
      endAngleDeg: -135,
    });
  });
});
