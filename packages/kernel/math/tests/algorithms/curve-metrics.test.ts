import { describe, expect, it } from 'vitest';

import { curve, curveMetrics } from '../../src';
import type { CurveSegment } from '../../src';

/** 独立复合 Simpson 参考，不使用被测累计模型 */
const referenceIntegral = (speed: (parameter: number) => number, end: number): number => {
  const intervals = 8192;
  const step = end / intervals;
  let sum = speed(0) + speed(end);
  for (let index = 1; index < intervals; index++) sum += (index % 2 === 0 ? 2 : 4) * speed(index * step);
  return (sum * step) / 3;
};

describe('可复用曲线长度模型', () => {
  it.each([undefined, false, true])('跨周角度的度量与采样使用相同方向规则：%s', counterClockwise => {
    for (const endAngleDeg of [450, -450]) {
      const common = { center: [0, 0] satisfies [number, number], startAngleDeg: 0, endAngleDeg, counterClockwise };
      const expectedSweep =
        (counterClockwise ?? endAngleDeg < 0) ? (endAngleDeg > 0 ? -270 : -90) : endAngleDeg > 0 ? 90 : 270;
      for (const segment of [
        { ...common, kind: 'arc', radius: 1 },
        { ...common, kind: 'ellipseArc', radiusX: 1, radiusY: 1 },
      ] satisfies Array<CurveSegment>) {
        const model = curveMetrics.prepare(segment);
        if (model === null) throw new Error('Expected model');
        expect(model.length).toBeCloseTo((Math.abs(expectedSweep) * Math.PI) / 180, 7);
        const parameter = curveMetrics.parameterAt(model, model.length / 2);
        const sample = curve.sampleAt(segment, parameter);
        expect(sample.point[0]).toBeCloseTo(Math.cos((expectedSweep * Math.PI) / 360), 7);
        expect(sample.point[1]).toBeCloseTo(Math.sin((expectedSweep * Math.PI) / 360), 7);
      }
    }
  });
  it('共线非匀速三次曲线按距离反解，查询不改变准备结果', () => {
    const model = curveMetrics.prepare({
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [0, 0],
      control2: [0, 0],
      to: [100, 0],
    });
    expect(model).not.toBeNull();
    if (model === null) throw new Error('Expected model');
    const before = structuredClone(model);
    for (const distance of [0, 0.001, 12.5, 50, 99.9, 100]) {
      const parameter = curveMetrics.parameterAt(model, distance);
      expect(Math.abs(100 * parameter ** 3 - distance)).toBeLessThanOrEqual(1e-4);
    }
    expect(model).toEqual(before);
  });

  it('往返曲线的总长和驻点两侧反解保留方向变化', () => {
    const model = curveMetrics.prepare({ kind: 'quadraticBezier', from: [0, 0], control: [100, 0], to: [0, 0] });
    if (model === null) throw new Error('Expected model');
    expect(model.length).toBeCloseTo(100, 6);
    expect(curveMetrics.parameterAt(model, 50)).toBeCloseTo(0.5, 6);
    expect(curveMetrics.parameterAt(model, 25)).toBeLessThan(0.5);
    expect(curveMetrics.parameterAt(model, 75)).toBeGreaterThan(0.5);
  });

  it.each([
    {
      name: '高偏心椭圆',
      segment: {
        kind: 'ellipseArc',
        center: [3, -2],
        radiusX: 100,
        radiusY: 0.1,
        startAngleDeg: 0,
        endAngleDeg: 360,
        rotationDeg: 35,
      } satisfies CurveSegment,
      speed: (t: number) => 2 * Math.PI * Math.hypot(100 * Math.sin(2 * Math.PI * t), 0.1 * Math.cos(2 * Math.PI * t)),
    },
    {
      name: '弯曲三次曲线',
      segment: {
        kind: 'cubicBezier',
        from: [0, 0],
        control1: [0, 100],
        control2: [100, -100],
        to: [100, 0],
      } satisfies CurveSegment,
      speed: (t: number) => Math.hypot(600 * t * (1 - t), 300 * (1 - 6 * t + 6 * t * t)),
    },
  ])('$name 与独立积分参考在误差预算内一致', ({ segment, speed }) => {
    const model = curveMetrics.prepare(segment);
    if (model === null) throw new Error('Expected model');
    const expected = referenceIntegral(speed, 1);
    const tolerance = Math.max(1e-6, expected * 1e-6);
    expect(Math.abs(model.length - expected)).toBeLessThan(tolerance);
    for (const fraction of [0.001, 0.17, 0.5, 0.83, 0.999]) {
      const parameter = curveMetrics.parameterAt(model, expected * fraction);
      expect(Math.abs(referenceIntegral(speed, parameter) - expected * fraction)).toBeLessThan(tolerance);
      expect(curve.sampleAt(segment, parameter).point.every(Number.isFinite)).toBe(true);
    }
  });
});
