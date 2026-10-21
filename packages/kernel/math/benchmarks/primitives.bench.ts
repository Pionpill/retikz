import type { AffineMatrix, Position } from '@retikz/math';
import {
  applyAffine,
  boundsToRect,
  centerOfBounds,
  cornersOfBounds,
  ellipse,
  expandBounds,
  getAffineSimilarityScale,
  halfAxesOfBounds,
  isFiniteBoundsRect,
  isFiniteNonSingularAffine,
  isFiniteNumber,
  isFinitePoint,
  isInfiniteNumber,
  isPositiveBoundsRect,
  lerp,
  localToWorld,
  mergeBounds,
  multiplyAffine,
  point,
  rectToBounds,
  vector2,
  worldToLocal,
} from '@retikz/math';
import { expect } from 'vitest';

import { benchmarkBatch } from './_workloads';

const points: Array<Position> = Array.from({ length: 256 }, (_, index) => [index + 1, 2 * (index + 1)]);
const target: Position = [3, 4];
const origin: Position = [0, 0];
const shiftDistance = Math.sqrt(5);
const { add, sub, scale, dot, cross, length, normalize, normalizeOrNull, fromAngleDegrees, normal } = vector2;
const { distance, along, against, shiftToward, isEqual } = point;

/** 独立公式校验基础运算，浮点运算使用容差 */
const numericCases: Array<{
  name: string;
  displayName: string;
  run: (p: Position, index: number) => number;
  expected: (p: Position, index: number) => number;
}> = [
  { name: 'vector2.dot', displayName: '向量点积', run: p => dot(p, target), expected: p => p[0] * 11 },
  { name: 'vector2.cross', displayName: '向量叉积', run: p => cross(p, target), expected: p => -2 * p[0] },
  { name: 'vector2.length', displayName: '向量长度', run: p => length(p), expected: p => Math.sqrt(5) * p[0] },
  {
    name: 'point.distance',
    displayName: '点间距离',
    run: p => distance(p, target),
    expected: p => Math.sqrt((p[0] - 3) ** 2 + (p[1] - 4) ** 2),
  },
];
for (const entry of numericCases)
  benchmarkBatch(
    { id: entry.name, dimensions: [entry.displayName, ''] },
    index => entry.run(points[index % 256], index),
    (result, index) => expect(result).toBeCloseTo(entry.expected(points[index % 256], index), 8),
  );

const positionCases: Array<{
  name: string;
  displayName: string;
  run: (p: Position, index: number) => Position;
  expected: (p: Position, index: number) => Position;
}> = [
  { name: 'vector2.add', displayName: '向量相加', run: p => add(p, target), expected: p => [p[0] + 3, p[1] + 4] },
  { name: 'vector2.sub', displayName: '向量相减', run: p => sub(p, target), expected: p => [p[0] - 3, p[1] - 4] },
  { name: 'vector2.scale', displayName: '向量缩放', run: p => scale(p, 3), expected: p => [p[0] * 3, p[1] * 3] },
  {
    name: 'vector2.normalize',
    displayName: '向量归一化',
    run: p => normalize(p),
    expected: () => [1 / Math.sqrt(5), 2 / Math.sqrt(5)],
  },
  { name: 'vector2.normal', displayName: '向量法向', run: p => normal(p), expected: p => [-p[1], p[0]] },
  {
    name: 'vector2.fromAngleDegrees',
    displayName: '角度转向量',
    run: (_, index) => fromAngleDegrees(index % 360),
    expected: (_, index) => [Math.cos(((index % 360) * Math.PI) / 180), Math.sin(((index % 360) * Math.PI) / 180)],
  },
  {
    name: 'point.along',
    displayName: '点沿向量移动',
    run: p => along(p, target, 2),
    expected: p => [p[0] + 6, p[1] + 8],
  },
  {
    name: 'point.against',
    displayName: '点逆向量移动',
    run: p => against(p, target, 2),
    expected: p => [p[0] - 6, p[1] - 8],
  },
  {
    name: 'point.shiftToward',
    displayName: '点朝目标移动',
    run: p => shiftToward(origin, p, shiftDistance),
    expected: () => [1, 2],
  },
  {
    name: 'lerp',
    displayName: '线性插值',
    run: p => lerp(p, target, 0.5),
    expected: p => [(p[0] + 3) / 2, (p[1] + 4) / 2],
  },
];
for (const entry of positionCases)
  benchmarkBatch(
    { id: entry.name, dimensions: [entry.displayName, ''] },
    index => entry.run(points[index % 256], index),
    (result, index) => {
      const expected = entry.expected(points[index % 256], index);
      expect(result[0]).toBeCloseTo(expected[0], 8);
      expect(result[1]).toBeCloseTo(expected[1], 8);
    },
  );
benchmarkBatch(
  { id: 'vector2.normalizeOrNull/mixed', dimensions: ['向量归一化判空', '含零向量'] },
  index => normalizeOrNull(index % 2 ? origin : points[index % 256]),
  (result, index) => {
    if (index % 2) expect(result).toBeNull();
    else expect(result && Math.hypot(...result)).toBeCloseTo(1, 8);
  },
);
benchmarkBatch(
  { id: 'point.isEqual/mixed', dimensions: ['点相等判定', '混合'] },
  index => isEqual(points[index % 256], index % 2 ? target : points[index % 256]),
  (result, index) => expect(result).toBe(index % 2 === 0),
);
const guardLabels = {
  isFiniteNumber: '有限数判定',
  isInfiniteNumber: '无限数判定',
  isFinitePoint: '有限点判定',
  isFiniteBoundsRect: '有限矩形判定',
  isPositiveBoundsRect: '正尺寸矩形判定',
};
const values: Array<unknown> = [1, NaN, Infinity, -Infinity, '1', null, [1, 2], [NaN, 0]];
for (const [name, compute, expected] of [
  ['isFiniteNumber', isFiniteNumber, [true, false, false, false, false, false, false, false]],
  ['isInfiniteNumber', isInfiniteNumber, [false, false, true, true, false, false, false, false]],
  ['isFinitePoint', isFinitePoint, [false, false, false, false, false, false, true, false]],
] as const)
  benchmarkBatch(
    { id: `${name}/mixed`, dimensions: [`${guardLabels[name]}`, `混合`] },
    index => compute(values[index % 8]),
    (result, index) => expect(result).toBe(expected[index % 8]),
  );

const bounds = points.map(([x, y]) => ({ minX: x, minY: y, maxX: x + 6, maxY: y + 8 }));
const rects = points.map(([x, y]) => ({ x, y, width: 6, height: 8 }));
const unitBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
const insets = { left: 1, right: 2, top: 3, bottom: 4 };
benchmarkBatch(
  { id: 'boundsToRect', dimensions: ['边界转矩形', ''] },
  index => boundsToRect(bounds[index % 256]),
  (result, index) => expect(result).toEqual(rects[index % 256]),
);
benchmarkBatch(
  { id: 'rectToBounds', dimensions: ['矩形转边界', ''] },
  index => rectToBounds(rects[index % 256]),
  (result, index) => expect(result).toEqual(bounds[index % 256]),
);
benchmarkBatch(
  { id: 'mergeBounds', dimensions: ['合并边界', ''] },
  index => mergeBounds(bounds[index % 256], unitBounds),
  (result, index) => expect(result).toEqual({ ...bounds[index % 256], minX: 0, minY: 0 }),
);
benchmarkBatch(
  { id: 'centerOfBounds', dimensions: ['边界中心', ''] },
  index => centerOfBounds(bounds[index % 256]),
  (result, index) => expect(result).toEqual([points[index % 256][0] + 3, points[index % 256][1] + 4]),
);
benchmarkBatch(
  { id: 'halfAxesOfBounds', dimensions: ['边界半轴', ''] },
  index => halfAxesOfBounds(bounds[index % 256]),
  result => expect(result).toEqual({ halfWidth: 3, halfHeight: 4 }),
);
benchmarkBatch(
  { id: 'expandBounds', dimensions: ['扩展边界', ''] },
  index => expandBounds(bounds[index % 256], insets),
  (result, index) => {
    const original = bounds[index % 256];
    expect(result).toEqual({
      minX: original.minX - 1,
      maxX: original.maxX + 2,
      minY: original.minY - 3,
      maxY: original.maxY + 4,
    });
  },
);
benchmarkBatch(
  { id: 'cornersOfBounds', dimensions: ['边界角点', ''] },
  index => cornersOfBounds(bounds[index % 256]),
  (result, index) => {
    const original = bounds[index % 256];
    expect(result).toHaveLength(4);
    expect(new Set(result.map(p => `${p[0]},${p[1]}`))).toEqual(
      new Set([
        `${original.minX},${original.minY}`,
        `${original.maxX},${original.minY}`,
        `${original.maxX},${original.maxY}`,
        `${original.minX},${original.maxY}`,
      ]),
    );
  },
);
for (const [name, compute] of [
  ['isFiniteBoundsRect', isFiniteBoundsRect],
  ['isPositiveBoundsRect', isPositiveBoundsRect],
] as const) {
  const inputs = [rects[0], { x: 0, y: 0, width: Infinity, height: 1 }, { x: 0, y: 0, width: 0, height: 0 }];
  benchmarkBatch(
    { id: `${name}/mixed`, dimensions: [`${guardLabels[name]}`, `混合`] },
    index => compute(inputs[index % 3]),
    (result, index) => expect(result).toBe(index % 3 === 0 || (name === 'isFiniteBoundsRect' && index % 3 === 2)),
  );
}

const matrices: Array<AffineMatrix> = points.map(([x, y]) => [2, 0, 0, 2, x, y]);
const translation: AffineMatrix = [1, 0, 0, 1, 3, 4];
benchmarkBatch(
  { id: 'applyAffine', dimensions: ['仿射映射', ''] },
  index => applyAffine(matrices[index % 256], target),
  (result, index) => expect(result).toEqual([points[index % 256][0] + 6, points[index % 256][1] + 8]),
);
benchmarkBatch(
  { id: 'multiplyAffine', dimensions: ['仿射复合', ''] },
  index => multiplyAffine(matrices[index % 256], translation),
  (result, index) => expect(result).toEqual([2, 0, 0, 2, points[index % 256][0] + 6, points[index % 256][1] + 8]),
);
const transforms: Array<AffineMatrix> = [
  [2, 0, 0, 2, 1, 2],
  [0, 2, -2, 0, 1, 2],
  [1, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0],
];
benchmarkBatch(
  { id: 'isFiniteNonSingularAffine/mixed', dimensions: ['仿射有效性', '混合'] },
  index => isFiniteNonSingularAffine(transforms[index % 4]),
  (result, index) => expect(result).toBe(index % 4 !== 3),
);
benchmarkBatch(
  { id: 'getAffineSimilarityScale/mixed', dimensions: ['相似变换缩放', '混合'] },
  index => getAffineSimilarityScale(transforms[index % 4]),
  (result, index) => expect(result).toBe(index % 4 < 2 ? 2 : undefined),
);
for (const rotate of [0, Math.PI / 3]) {
  const shapes = points.map(([x, y]) => ({ x, y, rotate }));
  benchmarkBatch(
    { id: `localToWorld/rotation=${rotate}`, dimensions: [`局部转世界`, `${rotate === 0 ? '无旋转' : '旋转60°'}`] },
    index => localToWorld(shapes[index % 256], target),
    (result, index) => {
      expect(result[0]).toBeCloseTo(points[index % 256][0] + 3 * Math.cos(rotate) - 4 * Math.sin(rotate), 8);
      expect(result[1]).toBeCloseTo(points[index % 256][1] + 3 * Math.sin(rotate) + 4 * Math.cos(rotate), 8);
    },
  );
  const world = shapes.map(shape => localToWorld(shape, target));
  benchmarkBatch(
    { id: `worldToLocal/rotation=${rotate}`, dimensions: [`世界转局部`, `${rotate === 0 ? '无旋转' : '旋转60°'}`] },
    index => worldToLocal(shapes[index % 256], world[index % 256]),
    result => {
      expect(result[0]).toBeCloseTo(3, 8);
      expect(result[1]).toBeCloseTo(4, 8);
    },
  );
}

const ellipses = points.map(([x, y]) => ({ x, y, rx: 3, ry: 4, rotate: Math.PI / 3 }));
const { center, inscribedInBox, circumscribedHalfAxes, contains, boundaryPoint } = ellipse;
benchmarkBatch(
  { id: 'ellipse.center', dimensions: ['椭圆中心', ''] },
  index => center(ellipses[index % 256]),
  (result, index) => expect(result).toEqual(points[index % 256]),
);
const boxes = points.map(([x, y]) => ({ x, y, width: 6, height: 8, rotate: Math.PI / 3 }));
benchmarkBatch(
  { id: 'ellipse.inscribedInBox', dimensions: ['盒内接椭圆', ''] },
  index => inscribedInBox(boxes[index % 256]),
  (result, index) => expect(result).toEqual(ellipses[index % 256]),
);
const innerHalfAxes = points.map(([halfWidth, halfHeight]) => ({ halfWidth, halfHeight }));
for (const mode of ['equal', 'proportional'] as const)
  benchmarkBatch(
    {
      id: `ellipse.circumscribedHalfAxes/${mode}`,
      dimensions: [`椭圆外接半轴`, `${mode === 'equal' ? '等轴' : '等比例'}`],
    },
    index => circumscribedHalfAxes(innerHalfAxes[index % 256], mode),
    (result, index) => {
      expect(result.halfWidth).toBeCloseTo(points[index % 256][0] * (mode === 'equal' ? Math.sqrt(5) : Math.SQRT2), 8);
      expect(result.halfHeight).toBeCloseTo(
        points[index % 256][0] * (mode === 'equal' ? Math.sqrt(5) : 2 * Math.SQRT2),
        8,
      );
    },
  );
const queries = ellipses.map((e, index) => localToWorld(e, index % 2 ? [6, 8] : [0, 0]));
benchmarkBatch(
  { id: 'ellipse.contains/mixed', dimensions: ['椭圆命中', '内外混合'] },
  index => contains(ellipses[index % 256], queries[index % 256]),
  (result, index) => expect(result).toBe(index % 2 === 0),
);
const toward = ellipses.map(e => localToWorld(e, [6, 8]));
benchmarkBatch(
  { id: 'ellipse.boundaryPoint/rotated', dimensions: ['椭圆边界点', '旋转'] },
  index => boundaryPoint(ellipses[index % 256], toward[index % 256]),
  (result, index) => {
    const local = worldToLocal(ellipses[index % 256], result);
    expect((local[0] / 3) ** 2 + (local[1] / 4) ** 2).toBeCloseTo(1, 8);
  },
);
