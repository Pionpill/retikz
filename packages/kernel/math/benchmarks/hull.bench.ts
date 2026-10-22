import type { Position } from '@retikz/math';
import { boundsOf, circle, convexHull } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { createCloud, createRing, formatCount, pointCounts } from './_workloads';

for (const count of pointCounts) {
  for (const shape of ['cloud', 'ring', 'collinear-duplicates'] as const) {
    defineBenchmark(
      {
        id: `convexHull/${shape}/points=${count}`,
        dimensions: [
          `凸包`,
          `${{ cloud: '散点', ring: '圆周', 'collinear-duplicates': '共线重复' }[shape]}`,
          `${formatCount(count)}点`,
        ],
      },
      () => {
        const points =
          shape === 'cloud'
            ? createCloud(count)
            : shape === 'ring'
              ? createRing(count)
              : Array.from({ length: count }, (_, index): Position => [index % (count / 2), index % (count / 2)]);
        const compute = convexHull;
        return {
          run: () => compute(points),
          verify: result => {
            if (shape === 'cloud')
              expect(result).toEqual([
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ]);
            else if (shape === 'collinear-duplicates')
              expect(result).toEqual([
                [0, 0],
                [count / 2 - 1, count / 2 - 1],
              ]);
            else {
              expect(result).toHaveLength(count);
              expect(result.every(point => Math.abs(Math.hypot(...point) - 1) < 1e-10)).toBe(true);
            }
          },
        };
      },
      count === 1_000_000,
    );
  }
  defineBenchmark(
    { id: `boundsOf/cloud/points=${count}`, dimensions: [`包围盒`, `散点`, `${formatCount(count)}点`] },
    () => {
      const points = createCloud(count);
      const compute = boundsOf;
      return {
        run: () => compute(points),
        verify: result => expect(result).toEqual({ minX: -1, minY: -1, maxX: 1, maxY: 1 }),
      };
    },
    count === 1_000_000,
  );
}

// 检查旋转奇数圆周、支撑点不在开头及轴向候选不足的输入
for (const shape of ['rotated-ring', 'reordered-cloud', 'off-axis'] as const) {
  for (const count of shape === 'rotated-ring' ? [17, 101, 1_001] : [16, 100, 1_000, 10_000]) {
    defineBenchmark(
      {
        id: `circle.minimalEnclosing/${shape}/points=${count}`,
        dimensions: [
          '最小外接圆',
          { 'rotated-ring': '旋转奇数圆周', 'reordered-cloud': '重排散点', 'off-axis': '斜向外点' }[shape],
          `${formatCount(count)}点`,
        ],
      },
      () => {
        let points: Array<Position>;
        if (shape === 'rotated-ring') {
          points = Array.from({ length: count }, (_, index): Position => {
            const angle = (index * 2 * Math.PI) / count + 0.137;
            return [3 + 2 * Math.cos(angle), -4 + 2 * Math.sin(angle)];
          });
        } else if (shape === 'reordered-cloud') {
          points = createCloud(count);
          let seed = 0x9e3779b9;
          for (let index = count - 1; index > 0; index--) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const other = seed % (index + 1);
            [points[index], points[other]] = [points[other], points[index]];
          }
        } else {
          points = [
            [-2, 0],
            [2, 0],
            [0, -1],
            [0, 1],
          ];
          for (let index = 4; index < count - 1; index++) points.push([Math.sin(index) * 0.5, Math.cos(index) * 0.5]);
          points.push([1.9, 0.9]);
        }
        const expectedCenter: Position =
          shape === 'rotated-ring' ? [3, -4] : shape === 'off-axis' ? [0, 7 / 30] : [0, 0];
        const expectedRadius = shape === 'rotated-ring' ? 2 : shape === 'off-axis' ? Math.hypot(2, 7 / 30) : Math.SQRT2;
        const compute = circle.minimalEnclosing;
        return {
          run: () => compute(points),
          verify: result => {
            expect(result?.center[0]).toBeCloseTo(expectedCenter[0], 8);
            expect(result?.center[1]).toBeCloseTo(expectedCenter[1], 8);
            expect(result?.radius).toBeCloseTo(expectedRadius, 8);
          },
        };
      },
    );
  }
}

// 有序边界会放大增量最小圆的嵌套循环，按节点包围场景单独限制规模
for (const shape of ['cloud', 'ordered-ring'] as const) {
  for (const count of shape === 'cloud' ? [16, 100, 1_000, 10_000] : [16, 100, 1_000]) {
    defineBenchmark(
      {
        id: `circle.minimalEnclosing/${shape}/points=${count}`,
        dimensions: [`最小外接圆`, `${shape === 'cloud' ? '散点' : '有序圆周'}`, `${formatCount(count)}点`],
      },
      () => {
        const points = shape === 'cloud' ? createCloud(count) : createRing(count);
        const compute = circle.minimalEnclosing;
        return {
          run: () => compute(points),
          verify: result => {
            expect(result?.radius).toBeCloseTo(shape === 'cloud' ? Math.SQRT2 : 1, 8);
            expect(result?.center[0]).toBeCloseTo(0, 8);
            expect(result?.center[1]).toBeCloseTo(0, 8);
          },
        };
      },
    );
  }
}
