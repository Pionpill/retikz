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
