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

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';

const points: Array<Position> = [
  [1, 2],
  [2, 4],
];
const target: Position = [3, 4];
const origin: Position = [0, 0];
const shiftDistance = Math.sqrt(5);
const { add, sub, scale, dot, cross, length, normalize, normalizeOrNull, fromAngleDegrees, normal } = vector2;
const { distance, along, against, shiftToward, isEqual } = point;

/** 独立公式校验基础运算，浮点运算使用容差 */
const numericCases: Array<{
  name: string;
  displayName: string;
  run: (p: Position) => number;
  expected: (p: Position) => number;
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
  defineBenchmark({ id: entry.name, dimensions: [entry.displayName, '', '单次'] }, () => ({
    run: () => entry.run(points[0]),
    verify: result => expect(result).toBeCloseTo(entry.expected(points[0]), 8),
  }));

const positionCases: Array<{
  name: string;
  displayName: string;
  run: (p: Position) => Position;
  expected: (p: Position) => Position;
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
    run: () => fromAngleDegrees(45),
    expected: () => [Math.cos((45 * Math.PI) / 180), Math.sin((45 * Math.PI) / 180)],
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
  defineBenchmark({ id: entry.name, dimensions: [entry.displayName, '', '单次'] }, () => ({
    run: () => entry.run(points[0]),
    verify: result => {
      const expected = entry.expected(points[0]);
      expect(result[0]).toBeCloseTo(expected[0], 8);
      expect(result[1]).toBeCloseTo(expected[1], 8);
    },
  }));
for (const [index, label] of ['非零向量', '零向量'].entries())
  defineBenchmark(
    { id: `vector2.normalizeOrNull/input=${index}`, dimensions: ['向量归一化判空', label, '单次'] },
    () => {
      const input = index === 1 ? origin : points[0];
      return {
        run: () => normalizeOrNull(input),
        verify: result => {
          if (index === 1) expect(result).toBeNull();
          else expect(result && Math.hypot(...result)).toBeCloseTo(1, 8);
        },
      };
    },
  );
for (const [index, label] of ['相同', '不同'].entries())
  defineBenchmark({ id: `point.isEqual/input=${index}`, dimensions: ['点相等判定', label, '单次'] }, () => {
    const input = points[0];
    const other = index === 1 ? target : input;
    return {
      run: () => isEqual(input, other),
      verify: result => expect(result).toBe(index === 0),
    };
  });
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
  for (const [index, label] of ['有限数', 'NaN', '正无穷', '负无穷', '字符串', 'null', '有效点', '非有限点'].entries())
    defineBenchmark({ id: `${name}/input=${index}`, dimensions: [guardLabels[name], label, '单次'] }, () => ({
      run: () => compute(values[index]),
      verify: result => expect(result).toBe(expected[index]),
    }));

const bounds = points.map(([x, y]) => ({ minX: x, minY: y, maxX: x + 6, maxY: y + 8 }));
const rects = points.map(([x, y]) => ({ x, y, width: 6, height: 8 }));
const unitBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
const insets = { left: 1, right: 2, top: 3, bottom: 4 };
defineBenchmark({ id: 'boundsToRect', dimensions: ['边界转矩形', '', '单次'] }, () => ({
  run: () => boundsToRect(bounds[0]),
  verify: result => expect(result).toEqual(rects[0]),
}));
defineBenchmark({ id: 'rectToBounds', dimensions: ['矩形转边界', '', '单次'] }, () => ({
  run: () => rectToBounds(rects[0]),
  verify: result => expect(result).toEqual(bounds[0]),
}));
defineBenchmark({ id: 'mergeBounds', dimensions: ['合并边界', '', '单次'] }, () => ({
  run: () => mergeBounds(bounds[0], unitBounds),
  verify: result => expect(result).toEqual({ ...bounds[0], minX: 0, minY: 0 }),
}));
defineBenchmark({ id: 'centerOfBounds', dimensions: ['边界中心', '', '单次'] }, () => ({
  run: () => centerOfBounds(bounds[0]),
  verify: result => expect(result).toEqual([points[0][0] + 3, points[0][1] + 4]),
}));
defineBenchmark({ id: 'halfAxesOfBounds', dimensions: ['边界半轴', '', '单次'] }, () => ({
  run: () => halfAxesOfBounds(bounds[0]),
  verify: result => expect(result).toEqual({ halfWidth: 3, halfHeight: 4 }),
}));
defineBenchmark({ id: 'expandBounds', dimensions: ['扩展边界', '', '单次'] }, () => ({
  run: () => expandBounds(bounds[0], insets),
  verify: result => {
    const original = bounds[0];
    expect(result).toEqual({
      minX: original.minX - 1,
      maxX: original.maxX + 2,
      minY: original.minY - 3,
      maxY: original.maxY + 4,
    });
  },
}));
defineBenchmark({ id: 'cornersOfBounds', dimensions: ['边界角点', '', '单次'] }, () => ({
  run: () => cornersOfBounds(bounds[0]),
  verify: result => {
    const original = bounds[0];
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
}));
for (const [name, compute] of [
  ['isFiniteBoundsRect', isFiniteBoundsRect],
  ['isPositiveBoundsRect', isPositiveBoundsRect],
] as const) {
  const inputs = [rects[0], { x: 0, y: 0, width: Infinity, height: 1 }, { x: 0, y: 0, width: 0, height: 0 }];
  for (const [index, label] of ['正尺寸', '无穷尺寸', '零尺寸'].entries())
    defineBenchmark({ id: `${name}/input=${index}`, dimensions: [guardLabels[name], label, '单次'] }, () => ({
      run: () => compute(inputs[index]),
      verify: result => expect(result).toBe(index === 0 || (name === 'isFiniteBoundsRect' && index === 2)),
    }));
}

const matrices: Array<AffineMatrix> = points.map(([x, y]) => [2, 0, 0, 2, x, y]);
const translation: AffineMatrix = [1, 0, 0, 1, 3, 4];
defineBenchmark({ id: 'applyAffine', dimensions: ['仿射映射', '', '单次'] }, () => ({
  run: () => applyAffine(matrices[0], target),
  verify: result => expect(result).toEqual([points[0][0] + 6, points[0][1] + 8]),
}));
defineBenchmark({ id: 'multiplyAffine', dimensions: ['仿射复合', '', '单次'] }, () => ({
  run: () => multiplyAffine(matrices[0], translation),
  verify: result => expect(result).toEqual([2, 0, 0, 2, points[0][0] + 6, points[0][1] + 8]),
}));
const transforms: Array<AffineMatrix> = [
  [2, 0, 0, 2, 1, 2],
  [0, 2, -2, 0, 1, 2],
  [1, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0],
];
for (const [index, label] of ['缩放', '旋转', '错切', '奇异'].entries())
  defineBenchmark(
    { id: `isFiniteNonSingularAffine/input=${index}`, dimensions: ['仿射有效性', label, '单次'] },
    () => ({
      run: () => isFiniteNonSingularAffine(transforms[index]),
      verify: result => expect(result).toBe(index !== 3),
    }),
  );
for (const [index, label] of ['缩放', '旋转', '错切', '奇异'].entries())
  defineBenchmark(
    { id: `getAffineSimilarityScale/input=${index}`, dimensions: ['相似变换缩放', label, '单次'] },
    () => ({
      run: () => getAffineSimilarityScale(transforms[index]),
      verify: result => expect(result).toBe(index < 2 ? 2 : undefined),
    }),
  );
for (const rotate of [0, Math.PI / 3]) {
  const shapes = points.map(([x, y]) => ({ x, y, rotate }));
  defineBenchmark(
    {
      id: `localToWorld/rotation=${rotate}`,
      dimensions: [`局部转世界`, `${rotate === 0 ? '无旋转' : '旋转60°'}`, '单次'],
    },
    () => ({
      run: () => localToWorld(shapes[0], target),
      verify: result => {
        expect(result[0]).toBeCloseTo(points[0][0] + 3 * Math.cos(rotate) - 4 * Math.sin(rotate), 8);
        expect(result[1]).toBeCloseTo(points[0][1] + 3 * Math.sin(rotate) + 4 * Math.cos(rotate), 8);
      },
    }),
  );
  const world = shapes.map(shape => localToWorld(shape, target));
  defineBenchmark(
    {
      id: `worldToLocal/rotation=${rotate}`,
      dimensions: [`世界转局部`, `${rotate === 0 ? '无旋转' : '旋转60°'}`, '单次'],
    },
    () => ({
      run: () => worldToLocal(shapes[0], world[0]),
      verify: result => {
        expect(result[0]).toBeCloseTo(3, 8);
        expect(result[1]).toBeCloseTo(4, 8);
      },
    }),
  );
}

const ellipses = points.map(([x, y]) => ({ x, y, rx: 3, ry: 4, rotate: Math.PI / 3 }));
const { center, inscribedInBox, circumscribedHalfAxes, contains, boundaryPoint } = ellipse;
defineBenchmark({ id: 'ellipse.center', dimensions: ['椭圆中心', '', '单次'] }, () => ({
  run: () => center(ellipses[0]),
  verify: result => expect(result).toEqual(points[0]),
}));
const boxes = points.map(([x, y]) => ({ x, y, width: 6, height: 8, rotate: Math.PI / 3 }));
defineBenchmark({ id: 'ellipse.inscribedInBox', dimensions: ['盒内接椭圆', '', '单次'] }, () => ({
  run: () => inscribedInBox(boxes[0]),
  verify: result => expect(result).toEqual(ellipses[0]),
}));
const innerHalfAxes = points.map(([halfWidth, halfHeight]) => ({ halfWidth, halfHeight }));
for (const mode of ['equal', 'proportional'] as const)
  defineBenchmark(
    {
      id: `ellipse.circumscribedHalfAxes/${mode}`,
      dimensions: [`椭圆外接半轴`, `${mode === 'equal' ? '等轴' : '等比例'}`, '单次'],
    },
    () => ({
      run: () => circumscribedHalfAxes(innerHalfAxes[0], mode),
      verify: result => {
        expect(result.halfWidth).toBeCloseTo(points[0][0] * (mode === 'equal' ? Math.sqrt(5) : Math.SQRT2), 8);
        expect(result.halfHeight).toBeCloseTo(points[0][0] * (mode === 'equal' ? Math.sqrt(5) : 2 * Math.SQRT2), 8);
      },
    }),
  );
const queries = ellipses.map((e, index) => localToWorld(e, index % 2 ? [6, 8] : [0, 0]));
for (const [index, label] of ['内部', '外部'].entries())
  defineBenchmark({ id: `ellipse.contains/input=${index}`, dimensions: ['椭圆命中', label, '单次'] }, () => ({
    run: () => contains(ellipses[index], queries[index]),
    verify: result => expect(result).toBe(index % 2 === 0),
  }));
const toward = ellipses.map(e => localToWorld(e, [6, 8]));
defineBenchmark({ id: 'ellipse.boundaryPoint/rotated', dimensions: ['椭圆边界点', '旋转', '单次'] }, () => ({
  run: () => boundaryPoint(ellipses[0], toward[0]),
  verify: result => {
    const local = worldToLocal(ellipses[0], result);
    expect((local[0] / 3) ** 2 + (local[1] / 4) ** 2).toBeCloseTo(1, 8);
  },
}));
