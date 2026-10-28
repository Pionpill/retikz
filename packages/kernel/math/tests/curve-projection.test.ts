import { describe, expect, it } from 'vitest';

import { curve } from '../src';
import type { CurveSegment } from '../src';

describe('曲线投影范围', () => {
  it('使用二次贝塞尔曲线的内部极值而非控制点确定投影范围', () => {
    expect(
      curve.projectedRange({ kind: 'quadraticBezier', from: [0, 0], control: [20, 10], to: [0, 20] }, [1, 0]),
    ).toEqual({ min: 0, max: 10 });
  });

  it('将圆弧极值限制在指定的扫掠范围内', () => {
    const range = curve.projectedRange(
      { kind: 'arc', center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 90 },
      [-1, 0],
    );

    expect(range.min).toBeCloseTo(-10);
    expect(range.max).toBeCloseTo(0);
  });
});

it('计算三次贝塞尔曲线的极值并处理零投影轴', () => {
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
it('计算旋转椭圆在反向扫掠时的极值', () => {
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

it('退化几何保持恒定的投影值', () => {
  const segments: Array<CurveSegment> = [
    { kind: 'line', from: [3, 4], to: [3, 4] },
    { kind: 'quadraticBezier', from: [3, 4], control: [3, 4], to: [3, 4] },
    { kind: 'cubicBezier', from: [3, 4], control1: [3, 4], control2: [3, 4], to: [3, 4] },
    {
      kind: 'ellipseArc',
      center: [3, 4],
      radiusX: 0,
      radiusY: 0,
      rotationDeg: 37,
      startAngleDeg: 0,
      endAngleDeg: -360,
    },
  ];
  for (const segment of segments) {
    expect(curve.projectedRange(segment, [-2, 3])).toEqual({ min: 6, max: 6 });
  }
});
