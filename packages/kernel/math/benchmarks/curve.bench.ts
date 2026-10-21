import type { CurveSegment, Position } from '@retikz/math';
import { curve } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { benchmarkBatch, formatCount, pointCounts } from './_workloads';

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

for (const { name, displayName, segment } of fixtures) {
  const { sampleAt, slice, projectedRange, parameterAtDistance, approximateLength } = curve;
  const parameters = Array.from({ length: 256 }, (_, index) => index / 255);
  const samples = parameters.map(parameter => sampleAt(segment, parameter));
  benchmarkBatch(
    { id: `curve.sampleAt/${name}`, dimensions: [`曲线采样`, `${displayName}`] },
    index => sampleAt(segment, parameters[index % 256]),
    (result, index) => {
      expect(result.point).toEqual(samples[index % 256].point);
      expect(Math.hypot(...result.tangent)).toBeCloseTo(1, 8);
    },
  );
  benchmarkBatch(
    { id: `curve.slice/${name}`, dimensions: [`曲线裁剪`, `${displayName}`] },
    index => slice(segment, 0, parameters[index % 256]),
    (result, index) => {
      const endpoint = sampleAt(result, 1).point;
      expect(endpoint[0]).toBeCloseTo(samples[index % 256].point[0], 8);
      expect(endpoint[1]).toBeCloseTo(samples[index % 256].point[1], 8);
    },
  );
  const axes: Array<Position> = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 0.5],
  ];
  benchmarkBatch(
    { id: `curve.projectedRange/${name}`, dimensions: [`曲线投影`, `${displayName}`] },
    index => projectedRange(segment, axes[index % 4]),
    (result, index) => {
      for (const { point } of samples) {
        const axis = axes[index % 4];
        const projection = point[0] * axis[0] + point[1] * axis[1];
        expect(projection).toBeGreaterThanOrEqual(result.min - 1e-8);
        expect(projection).toBeLessThanOrEqual(result.max + 1e-8);
      }
    },
  );
  // 弧长反解是路径裁剪/端点接触负载，不对每个 Plot 数据点做一次反解
  for (const cached of [true, false]) {
    const totalLength = approximateLength(segment);
    const options = cached ? { totalLength } : {};
    for (const count of [10, 100, 1_000]) {
      // 各规模均匀覆盖完整距离区间，避免把查询位置分布变化混入扩容成本
      const distances = Array.from({ length: count }, (_, index) => (index / (count - 1)) * totalLength);
      benchmarkBatch(
        {
          id: `curve.parameterAtDistance/${name}/${cached ? 'cached' : 'uncached'}`,
          dimensions: [`弧长反解`, `${displayName} · ${cached ? '缓存总长' : '现算总长'}`],
        },
        index => parameterAtDistance(segment, distances[index], options),
        (result, index) => {
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
          expect(approximateLength(slice(segment, 0, result))).toBeCloseTo(distances[index], 2);
        },
        [count],
      );
    }
  }
}
