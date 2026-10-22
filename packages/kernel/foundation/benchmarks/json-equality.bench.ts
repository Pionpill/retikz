import { jsonStructuralEquals } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { formatCount } from './_workloads';

// 小型 context 与较大 Source 的代表形态；规模用于探索，不代表业务上限
for (const count of [16, 1_000, 10_000, 100_000]) {
  for (const scenario of ['same-reference', 'equal-copy', 'first-difference', 'last-difference'] as const) {
    defineBenchmark(
      {
        id: `jsonStructuralEquals/${scenario}/count=${count}`,
        dimensions: ['JSON 结构比较', scenario, `${formatCount(count)}条嵌套记录`],
      },
      () => {
        const left = Array.from({ length: count }, (_, index) => ({
          id: index,
          options: { enabled: true, values: [index, index + 1] },
        }));
        const right =
          scenario === 'same-reference'
            ? left
            : left.map(record => ({
                options: { values: [...record.options.values], enabled: record.options.enabled },
                id: record.id,
              }));
        if (scenario === 'first-difference') right[0].options.values[0] = -1;
        if (scenario === 'last-difference') right[count - 1].options.values[1] = -1;
        return {
          run: () => jsonStructuralEquals(left, right),
          verify: result => expect(result).toBe(scenario === 'same-reference' || scenario === 'equal-copy'),
        };
      },
    );
  }
}
