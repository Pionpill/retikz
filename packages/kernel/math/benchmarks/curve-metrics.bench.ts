import type { CurveSegment } from '@retikz/math';
import { curve, curveMetrics } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';

/** 固定控制点数的代表曲线；查询次数不是几何规模 */
const fixtures: Array<{ name: string; label: string; segment: CurveSegment }> = [
  { name: 'line', label: '直线', segment: { kind: 'line', from: [0, 0], to: [30, 40] } },
  {
    name: 'arc',
    label: '圆弧',
    segment: { kind: 'arc', center: [0, 0], radius: 50, startAngleDeg: 0, endAngleDeg: 180 },
  },
  {
    name: 'quadratic',
    label: '二次贝塞尔',
    segment: { kind: 'quadraticBezier', from: [0, 0], control: [20, 80], to: [100, 0] },
  },
  {
    name: 'cubic',
    label: '三次贝塞尔',
    segment: { kind: 'cubicBezier', from: [0, 0], control1: [0, 100], control2: [100, -100], to: [100, 0] },
  },
  {
    name: 'ellipse',
    label: '椭圆弧',
    segment: { kind: 'ellipseArc', center: [0, 0], radiusX: 100, radiusY: 10, startAngleDeg: 0, endAngleDeg: 180 },
  },
];

for (const { name, label, segment } of fixtures) {
  defineBenchmark({ id: `curveMetrics.prepare/${name}`, dimensions: ['度量准备', label, '单段；默认精度'] }, () => {
    // 独立等距折线参考只用于计时外校验，不调用被测积分模型
    const expected = curve.approximateLength(segment, { sampleCount: 8192 });
    const before = structuredClone(segment);
    return {
      run: () => curveMetrics.prepare(segment),
      verify: model => {
        if (!model) throw new Error('Expected finite length model');
        expect(Math.abs(model.length - expected)).toBeLessThan(expected * 1e-6);
        expect(segment).toEqual(before);
      },
    };
  });
  defineBenchmark(
    { id: `curveMetrics.parameterAt/${name}`, dimensions: ['复用度量查询', label, '单次查询；t=0.375'] },
    () => {
      const model = curveMetrics.prepare(segment);
      if (!model) throw new Error('Expected finite length model');
      const before = structuredClone(model);
      const distance = curve.approximateLength(curve.slice(segment, 0, 0.375), { sampleCount: 8192 });
      return {
        run: () => curveMetrics.parameterAt(model, distance),
        verify: parameter => {
          expect(parameter).toBeCloseTo(0.375, 5);
          expect(model).toEqual(before);
        },
      };
    },
  );
}
