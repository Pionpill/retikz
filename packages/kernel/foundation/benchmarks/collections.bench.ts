import { createReadonlyMap } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { formatCount, inputCounts } from './_workloads';

for (const count of [16, 100, ...inputCounts]) {
  defineBenchmark(
    {
      id: `createReadonlyMap/entries/count=${count}`,
      dimensions: ['只读 Map 快照', count <= 100 ? '注册表' : '场景索引', `${formatCount(count)}项`],
    },
    () => {
      const input = new Map(Array.from({ length: count }, (_, index) => [`key-${index}`, { id: index }] as const));
      return {
        run: () => createReadonlyMap(input),
        verify: result => {
          expect(result.size).toBe(count);
          expect(Object.isFrozen(result)).toBe(true);
          expect(result.get('key-0')).toBe(input.get('key-0'));
          expect(result.get(`key-${count - 1}`)).toBe(input.get(`key-${count - 1}`));
          let visited = 0;
          let matches = true;
          for (const [key, value] of result) {
            matches = matches && key === `key-${visited}` && value.id === visited;
            visited++;
          }
          expect(matches).toBe(true);
          expect(visited).toBe(count);
          input.clear();
          expect(result.size).toBe(count);
          expect(result.get('key-0')).toEqual({ id: 0 });
        },
      };
    },
    count === 1_000_000,
  );
}
