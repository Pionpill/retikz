import type { Position } from '@retikz/math';
import {
  collectArcBoundingCandidates,
  collectEllipseArcBoundingCandidates,
  intersect,
  intersectRayWithArc,
  isAngleWithinArcSweep,
  pointAtArcAngle,
  pointAtEllipseArcAngle,
  triangle,
} from '@retikz/math';
import { expect } from 'vitest';

import { benchmarkBatch } from './_workloads';

const centers: Array<Position> = Array.from({ length: 256 }, (_, index) => [index, index / 2]);
const arcs = centers.map(center => ({ center, radius: 5, startAngleDeg: 0, endAngleDeg: 180 }));
const ellipses = centers.map(center => ({ center, radiusX: 5, radiusY: 3, startAngleDeg: 0, endAngleDeg: 180 }));
const angles = Array.from({ length: 256 }, (_, index) => (index * 360) / 256);
benchmarkBatch(
  { id: 'pointAtArcAngle', dimensions: ['圆弧取点', ''] },
  index => pointAtArcAngle(centers[index % 256], 5, angles[index % 256]),
  (result, index) =>
    expect(Math.hypot(result[0] - centers[index % 256][0], result[1] - centers[index % 256][1])).toBeCloseTo(5, 8),
);
const ellipseAngles = ellipses.map((e, index) => ({ ...e, angleDeg: angles[index] }));
benchmarkBatch(
  { id: 'pointAtEllipseArcAngle', dimensions: ['椭圆弧取点', ''] },
  index => pointAtEllipseArcAngle(ellipseAngles[index % 256]),
  (result, index) => {
    const center = centers[index % 256];
    expect(((result[0] - center[0]) / 5) ** 2 + ((result[1] - center[1]) / 3) ** 2).toBeCloseTo(1, 8);
  },
);
benchmarkBatch(
  { id: 'collectArcBoundingCandidates', dimensions: ['圆弧边界', ''] },
  index => collectArcBoundingCandidates(arcs[index % 256]),
  (result, index) => {
    const [x, y] = centers[index % 256];
    expect(Math.min(...result.map(p => p[0]))).toBeCloseTo(x - 5, 8);
    expect(Math.max(...result.map(p => p[0]))).toBeCloseTo(x + 5, 8);
    expect(Math.max(...result.map(p => p[1]))).toBeCloseTo(y + 5, 8);
  },
);
benchmarkBatch(
  { id: 'collectEllipseArcBoundingCandidates', dimensions: ['椭圆弧边界', ''] },
  index => collectEllipseArcBoundingCandidates(ellipses[index % 256]),
  (result, index) => {
    const [x, y] = centers[index % 256];
    expect(Math.min(...result.map(p => p[0]))).toBeCloseTo(x - 5, 8);
    expect(Math.max(...result.map(p => p[0]))).toBeCloseTo(x + 5, 8);
    expect(Math.max(...result.map(p => p[1]))).toBeCloseTo(y + 3, 8);
  },
);
const sweeps = angles.map(angleDeg => ({ angleDeg, startAngleDeg: 0, endAngleDeg: 180 }));
benchmarkBatch(
  { id: 'isAngleWithinArcSweep/mixed', dimensions: ['弧内角判定', '混合'] },
  index => isAngleWithinArcSweep(sweeps[index % 256]),
  (result, index) => expect(result).toBe(angles[index % 256] <= 180),
);

const { lineLine, segmentSegment, lineCircle, circleCircle } = intersect;
for (const hit of [true, false]) {
  const lines = centers.map(([x, y]) => ({
    a1: [x, y] as Position,
    a2: [x + 2, y + 2] as Position,
    b1: [x, y + 2] as Position,
    b2: [x + 2, hit ? y : y + 4] as Position,
  }));
  for (const [name, compute] of [
    ['lineLine', lineLine],
    ['segmentSegment', segmentSegment],
  ] as const) {
    benchmarkBatch(
      {
        id: `intersect.${name}/${hit ? 'crossing' : 'parallel'}`,
        dimensions: [`${name === 'lineLine' ? '直线求交' : '线段求交'}`, `${hit ? '相交' : '平行'}`],
      },
      index => compute(lines[index % 256]),
      (result, index) =>
        expect(result).toEqual(hit ? [centers[index % 256][0] + 1, centers[index % 256][1] + 1] : null),
    );
  }
  const rays = centers.map(([x, y]) => ({
    origin: [x - 10, y + (hit ? 0 : 6)] as Position,
    direction: [1, 0] as Position,
    center: [x, y] as Position,
    radius: 5,
  }));
  benchmarkBatch(
    { id: `intersect.lineCircle/${hit ? 'hit' : 'miss'}`, dimensions: [`直线圆求交`, `${hit ? '命中' : '未命中'}`] },
    index => lineCircle(rays[index % 256]),
    (result, index) => {
      expect(result).toHaveLength(hit ? 2 : 0);
      for (const p of result)
        expect(Math.hypot(p[0] - centers[index % 256][0], p[1] - centers[index % 256][1])).toBeCloseTo(5, 8);
    },
  );
  const arcRays = rays.map(ray => ({ ...ray, startAngleDeg: 0, endAngleDeg: 180 }));
  benchmarkBatch(
    { id: `intersectRayWithArc/${hit ? 'hit' : 'miss'}`, dimensions: [`射线圆弧求交`, `${hit ? '命中' : '未命中'}`] },
    index => intersectRayWithArc(arcRays[index % 256]),
    result => expect(result).toEqual(hit ? [5, 15] : []),
  );
  const circles = centers.map(([x, y]) => ({
    centerA: [x, y] as Position,
    radiusA: 5,
    centerB: [x + (hit ? 6 : 20), y] as Position,
    radiusB: 5,
  }));
  benchmarkBatch(
    { id: `intersect.circleCircle/${hit ? 'hit' : 'miss'}`, dimensions: [`圆圆求交`, `${hit ? '命中' : '未命中'}`] },
    index => circleCircle(circles[index % 256]),
    (result, index) => {
      expect(result).toHaveLength(hit ? 2 : 0);
      for (const p of result) {
        expect(p[0]).toBeCloseTo(centers[index % 256][0] + 3, 8);
        expect(Math.abs(p[1] - centers[index % 256][1])).toBeCloseTo(4, 8);
      }
    },
  );
}
const { circumCircle, incircle } = triangle;
for (const degenerate of [false, true]) {
  const triangles = centers.map(([x, y]) => ({
    a: [x, y] as Position,
    b: [x + 6, y] as Position,
    c: [x, y + (degenerate ? 0 : 8)] as Position,
  }));
  for (const [name, compute, radius, offset] of [
    ['circumCircle', circumCircle, 5, [3, 4]],
    ['incircle', incircle, 2, [2, 2]],
  ] as const)
    benchmarkBatch(
      {
        id: `triangle.${name}/${degenerate ? 'degenerate' : 'right'}`,
        dimensions: [`三角形${name === 'circumCircle' ? '外接圆' : '内切圆'}`, `${degenerate ? '退化' : '直角'}`],
      },
      index => {
        const { a, b, c } = triangles[index % 256];
        return compute(a, b, c);
      },
      (result, index) => {
        if (degenerate) expect(result).toBeNull();
        else {
          expect(result?.radius).toBeCloseTo(radius, 8);
          expect(result?.center).toEqual([centers[index % 256][0] + offset[0], centers[index % 256][1] + offset[1]]);
        }
      },
    );
}
