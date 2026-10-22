import type { CurveSegment, Position } from '@retikz/math';
import { curve } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { formatCount, pointCounts } from './_workloads';

const fixtures: Array<{
  name: string;
  displayName: string;
  segment: CurveSegment;
  sampleCounts: Array<number>;
  minimum: number;
  maximum: number;
}> = [
  {
    name: 'quadratic',
    displayName: '二次贝塞尔',
    segment: { kind: 'quadraticBezier', from: [0, 0], control: [2, 3], to: [4, 0] },
    sampleCounts: [32, 64, 128, 512],
    minimum: 4,
    maximum: 8,
  },
  {
    name: 'line',
    displayName: '直线',
    segment: { kind: 'line', from: [0, 0], to: [3, 4] },
    sampleCounts: [32],
    minimum: 5,
    maximum: 5,
  },
  {
    name: 'arc',
    displayName: '圆弧',
    segment: { kind: 'arc', center: [0, 0], radius: 2, startAngleDeg: 0, endAngleDeg: 180 },
    sampleCounts: [32],
    minimum: 2 * Math.PI,
    maximum: 2 * Math.PI,
  },
  {
    name: 'cubic',
    displayName: '三次贝塞尔',
    segment: { kind: 'cubicBezier', from: [0, 0], control1: [0, 3], control2: [4, 3], to: [4, 0] },
    sampleCounts: [32, 64, 128, 512],
    minimum: 4,
    maximum: 10,
  },
  {
    name: 'ellipse',
    displayName: '椭圆弧',
    segment: { kind: 'ellipseArc', center: [0, 0], radiusX: 3, radiusY: 2, startAngleDeg: 0, endAngleDeg: 180 },
    sampleCounts: [32, 64, 128, 512],
    minimum: 6,
    maximum: 3 * Math.PI,
  },
];

for (const fixture of fixtures) {
  for (const sampleCount of fixture.sampleCounts) {
    defineBenchmark(
      {
        id: `curve.approximateLength/${fixture.name}/samples=${sampleCount}`,
        dimensions: [`弧长近似`, `${fixture.displayName}`, `精度${sampleCount}`],
      },
      () => {
        const approximateLength = curve.approximateLength;
        const options = { sampleCount };
        const original = structuredClone(fixture.segment);
        return {
          run: () => approximateLength(fixture.segment, options),
          verify: result => {
            expect(result).toBeGreaterThanOrEqual(fixture.minimum);
            expect(result).toBeLessThanOrEqual(fixture.maximum);
            expect(fixture.segment).toEqual(original);
          },
        };
      },
    );
  }
}

for (const count of pointCounts) {
  for (const shape of ['trend', 'nonuniform', 'duplicates'] as const) {
    defineBenchmark(
      {
        id: `curve.catmullRomToCubic/${shape}/points=${count}`,
        dimensions: [
          `过点曲线`,
          `${{ trend: '趋势', nonuniform: '非均匀', duplicates: '重复点' }[shape]}`,
          `${formatCount(count)}点`,
        ],
      },
      () => {
        const points = Array.from({ length: count }, (_, index): Position => {
          const step = shape === 'duplicates' ? Math.floor(index / 2) : index;
          return [shape === 'nonuniform' ? step + (step % 7) / 8 : step, Math.sin(step / 50)];
        });
        const compute = curve.catmullRomToCubic;
        return {
          run: () => compute(points, 1),
          verify: segments => {
            expect(segments).toHaveLength(count - 1);
            for (const index of [0, Math.floor(count / 2), count - 2]) {
              expect(segments[index].to).toEqual(points[index + 1]);
              expect(segments[index].control1.every(Number.isFinite)).toBe(true);
              expect(segments[index].control2.every(Number.isFinite)).toBe(true);
            }
          },
        };
      },
      count === 1_000_000,
    );
  }
}

for (const { name, displayName, segment, sampleCounts } of fixtures) {
  const { sampleAt, slice, projectedRange, parameterAtDistance, approximateLength } = curve;
  for (const parameter of [0.25, 0.75]) {
    defineBenchmark(
      { id: `curve.sampleAt/${name}/t=${parameter}`, dimensions: ['曲线采样', displayName, `t=${parameter}`] },
      () => ({
        run: () => sampleAt(segment, parameter),
        verify: result => {
          expect(result.point.every(Number.isFinite)).toBe(true);
          expect(Math.hypot(...result.tangent)).toBeCloseTo(1, 8);
        },
      }),
    );
  }
  defineBenchmark(
    { id: `curve.slice/${name}/interior`, dimensions: ['曲线裁剪', displayName, '区间0.25–0.75'] },
    () => {
      const start = sampleAt(segment, 0.25).point;
      const end = sampleAt(segment, 0.75).point;
      return {
        run: () => slice(segment, 0.25, 0.75),
        verify: result => {
          const actualStart = sampleAt(result, 0).point;
          const actualEnd = sampleAt(result, 1).point;
          for (const axis of [0, 1]) {
            expect(actualStart[axis]).toBeCloseTo(start[axis], 8);
            expect(actualEnd[axis]).toBeCloseTo(end[axis], 8);
          }
        },
      };
    },
  );
  for (const axis of [
    [1, 0],
    [1, 1],
  ] satisfies Array<Position>) {
    defineBenchmark(
      {
        id: `curve.projectedRange/${name}/axis=${axis.join(',')}`,
        dimensions: ['曲线投影', displayName, `轴(${axis.join(',')})`],
      },
      () => {
        const samples = Array.from({ length: 33 }, (_, index) => sampleAt(segment, index / 32).point);
        return {
          run: () => projectedRange(segment, axis),
          verify: result => {
            expect(Number.isFinite(result.min) && Number.isFinite(result.max)).toBe(true);
            for (const point of samples) {
              const projection = point[0] * axis[0] + point[1] * axis[1];
              expect(projection).toBeGreaterThanOrEqual(result.min - 1e-8);
              expect(projection).toBeLessThanOrEqual(result.max + 1e-8);
            }
          },
        };
      },
    );
  }
  // 只扩容单次反解的采样精度；重复查询和跨调用缓存由消费方衡量
  for (const sampleCount of sampleCounts) {
    defineBenchmark(
      {
        id: `curve.parameterAtDistance/${name}/samples=${sampleCount}`,
        dimensions: ['弧长反解', displayName, `精度${sampleCount}`],
      },
      () => {
        const options = { sampleCount };
        const distance = approximateLength(slice(segment, 0, 0.375), options);
        return {
          run: () => parameterAtDistance(segment, distance, options),
          verify: result => expect(result).toBeCloseTo(0.375, 3),
        };
      },
    );
  }
}
