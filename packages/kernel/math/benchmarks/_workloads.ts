import type { Position } from '@retikz/math';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import type { BenchmarkIdentity } from '../../../../scripts/benchmarks/types';

/** 简写输入规模，保留点数、顶点数或批量次数的单位由用例决定 */
export const formatCount = (count: number): string =>
  count >= 10_000 ? `${count / 10_000}万` : count >= 1_000 ? `${count / 1_000}千` : String(count);

/** 固定大小算法按调用批量测量，保留每个返回值；耗时包括批次循环和结果写入 */
export const benchmarkBatch = <T>(
  identity: BenchmarkIdentity,
  compute: (index: number) => T,
  verify: (result: T, index: number) => void,
  sizes: ReadonlyArray<number> = [1_000, 10_000, 100_000],
): void => {
  for (const count of sizes) {
    defineBenchmark(
      {
        id: `${identity.id}/operations=${count}`,
        dimensions: [...identity.dimensions, `${formatCount(count)}次`],
      },
      () => {
        const results = new Array<T>(count);
        return {
          run: () => {
            for (let index = 0; index < count; index++) results[index] = compute(index);
            return results;
          },
          verify: values => {
            for (let index = 0; index < Math.min(count, 256); index++) verify(values[index], index);
            verify(values[count - 1], count - 1);
          },
        };
      },
    );
  }
};

/** 点集算法的业务档和参考档 */
export const pointCounts = [1_000, 10_000, 100_000, 1_000_000];

/** 四角固定的确定性散点，凸包和边界有独立已知答案 */
export const createCloud = (count: number): Array<Position> => [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
  ...Array.from({ length: count - 4 }, (_, index): Position => [
    ((index * 137 + 17) % 997) / 500 - 0.996,
    ((index * 313 + 71) % 991) / 500 - 0.99,
  ]),
];

/** 圆周有序点集，用于高凸包占比与复杂多边形 */
export const createRing = (count: number): Array<Position> =>
  Array.from({ length: count }, (_, index): Position => [
    Math.cos((index * 2 * Math.PI) / count),
    Math.sin((index * 2 * Math.PI) / count),
  ]);
