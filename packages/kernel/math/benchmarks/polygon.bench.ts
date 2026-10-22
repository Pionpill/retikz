import type { Position } from '@retikz/math';
import { polygon } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { createRing, formatCount, pointCounts } from './_workloads';

// 单次命中查询仅按多边形顶点数扩容
for (const count of pointCounts) {
  for (const inside of [true, false]) {
    defineBenchmark(
      {
        id: `polygon.containsPoint/${inside ? 'inside' : 'outside'}/vertices=${count}`,
        dimensions: [`多边形命中`, `${inside ? '内部' : '外部'}`, `${formatCount(count)}顶点`],
      },
      () => {
        const vertices = createRing(count);
        const query: Position = inside ? [0.125, 0.125] : [2, 0.125];
        const compute = polygon.containsPoint;
        return { run: () => compute(vertices, query), verify: result => expect(result).toBe(inside) };
      },
      count === 1_000_000,
    );
  }
}

// 凹边界让水平射线多次穿过边，避免只验证圆周上少量交点的快路径
for (const count of [10_000, 100_000]) {
  for (const inside of [true, false]) {
    defineBenchmark(
      {
        id: `polygon.containsPoint/comb-${inside ? 'inside' : 'outside'}/vertices=${count}`,
        dimensions: ['多边形命中', `锯齿凹边界 · ${inside ? '内部' : '外部'}`, `${formatCount(count)}顶点`],
      },
      () => {
        const vertices: Array<Position> = [
          [0, -2],
          [count - 3, -2],
        ];
        for (let x = count - 3; x >= 0; x--) vertices.push([x, x % 2]);
        const query: Position = inside ? [1.25, 0.5] : [1.75, 0.5];
        const compute = polygon.containsPoint;
        return { run: () => compute(vertices, query), verify: result => expect(result).toBe(inside) };
      },
    );
  }
}
