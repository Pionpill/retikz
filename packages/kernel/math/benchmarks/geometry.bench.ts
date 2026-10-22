import type { ContourSegment } from '@retikz/math';
import {
  alignAngleSweep,
  buildContourCommands,
  intersectContourRay,
  normalizeAngleRange,
  normalizeDegrees,
  normalizeSignedDegrees,
  rectOutline,
  solveContourFillets,
} from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';

for (const degrees of [-450, 0, 450]) {
  defineBenchmark(
    { id: `normalizeDegrees/angle=${degrees}`, dimensions: ['角度归一化', String(degrees), '单次'] },
    () => ({
      run: () => normalizeDegrees(degrees),
      verify: result => expect(result).toBe(degrees < 0 ? 270 : degrees === 0 ? 0 : 90),
    }),
  );
  defineBenchmark(
    { id: `normalizeSignedDegrees/angle=${degrees}`, dimensions: ['有符号角度', String(degrees), '单次'] },
    () => ({
      run: () => normalizeSignedDegrees(degrees),
      verify: result => expect(result).toBe(degrees < 0 ? -90 : degrees === 0 ? 0 : 90),
    }),
  );
}
defineBenchmark({ id: 'normalizeAngleRange/cross-zero', dimensions: ['单向角度区间', '跨零', '单次'] }, () => ({
  run: () => normalizeAngleRange(300, 60),
  verify: result => expect(result).toEqual({ start: 300, end: 420, mid: 360 }),
}));
for (const ccw of [false, true]) {
  defineBenchmark(
    { id: `alignAngleSweep/ccw=${ccw}`, dimensions: ['有向圆弧', ccw ? '逆时针' : '顺时针', '单次'] },
    () => ({
      run: () => alignAngleSweep(300, 60, ccw),
      verify: result => expect(result.end).toBe(ccw ? 60 : 420),
    }),
  );
}
for (const radius of [0, 2, 100]) {
  defineBenchmark(
    {
      id: `rectOutline/radius=${radius}`,
      dimensions: ['矩形轮廓', radius === 0 ? '尖角' : radius === 2 ? '圆角' : '夹紧', '单次'],
    },
    () => ({
      run: () => rectOutline([0, 0], [10, 6], radius),
      verify: result => {
        expect(result).toHaveLength(radius === 0 ? 5 : 10);
        expect(result.at(-1)?.kind).toBe('close');
      },
    }),
  );
}
// Core/Extension 多边形轮廓消费；4/16 为常见形状，128/1024 为自定义复杂轮廓探索，不设未经验证的耗时预算
for (const count of [4, 16, 128, 1024]) {
  const points = Array.from({ length: count }, (_, index): [number, number] => [
    100 * Math.cos((index * 2 * Math.PI) / count),
    100 * Math.sin((index * 2 * Math.PI) / count),
  ]);
  const segments: Array<ContourSegment> = points.map((from, index) => ({
    kind: 'line',
    from,
    to: points[(index + 1) % count],
  }));
  for (const radius of [1, 200]) {
    defineBenchmark(
      {
        id: `solveContourFillets/vertices=${count}/radius=${radius}`,
        dimensions: ['轮廓圆角', radius === 1 ? '直接求解' : '半径夹紧', `${count} 顶点`],
      },
      () => ({
        run: () => solveContourFillets(segments, radius),
        verify: result => {
          expect(result).toHaveLength(count);
          for (const fillet of result!) {
            expect(fillet.radius).toBeGreaterThan(0);
            expect(fillet.radius).toBeLessThanOrEqual(radius);
            expect(
              Math.hypot(fillet.tangentInPoint[0] - fillet.center[0], fillet.tangentInPoint[1] - fillet.center[1]),
            ).toBeCloseTo(fillet.radius, 4);
          }
        },
      }),
    );
  }
  const fillets = solveContourFillets(segments, 1)!;
  defineBenchmark(
    { id: `buildContourCommands/vertices=${count}`, dimensions: ['轮廓命令', '复用圆角解', `${count} 顶点`] },
    () => ({
      run: () => buildContourCommands(segments, fillets),
      verify: result => {
        expect(result).toHaveLength(count * 2 + 2);
        expect(result[0].kind).toBe('move');
        expect(result.at(-1)?.kind).toBe('close');
      },
    }),
  );
  defineBenchmark(
    { id: `intersectContourRay/vertices=${count}`, dimensions: ['轮廓射线求交', '复用圆角解', `${count} 顶点`] },
    () => ({
      run: () => intersectContourRay(segments, [0, 0], [200, 0], fillets),
      verify: result => {
        expect(result).toBeDefined();
        expect(result![0]).toBeGreaterThan(90);
        expect(result![0]).toBeLessThanOrEqual(100);
        expect(result![1]).toBeCloseTo(0);
      },
    }),
  );
}
const arcLine: Array<ContourSegment> = [
  { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 180 },
  { kind: 'line', from: [-10, 0], to: [10, 0] },
];
defineBenchmark({ id: 'solveContourFillets/line-arc', dimensions: ['轮廓圆角', '半圆接直线', '2 段'] }, () => ({
  run: () => solveContourFillets(arcLine, 1),
  verify: result => {
    expect(result).toHaveLength(2);
    expect(result!.every(fillet => !fillet.clampedToZero)).toBe(true);
  },
}));
