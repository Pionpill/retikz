import type { Position } from '@retikz/math';
import { polygon } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { benchmarkBatch, createRing, formatCount, pointCounts } from './_workloads';

// 单次复杂边界查询与简单边界批量命中分别扩容，避免 vertices × queries 的失真负载
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
const vertices = createRing(16);
const queries: Array<Position> = Array.from({ length: 256 }, (_, index) =>
  index % 2 ? [2, index / 1024] : [0, index / 1024],
);
const containsPoint = polygon.containsPoint;
benchmarkBatch(
  { id: 'polygon.containsPoint/vertices=16/mixed', dimensions: ['多边形命中', '16顶点 · 内外混合'] },
  index => containsPoint(vertices, queries[index % 256]),
  (result, index) => expect(result).toBe(index % 2 === 0),
);
