import { definePattern, ProviderCapability, resolveCoreProviderDependencies } from '@retikz/core';
import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

for (const count of [16, 128, 512]) {
  for (const shape of ['chain', 'wide', 'diamond', 'duplicates'] as const) {
    defineBenchmark(
      {
        id: `contract/provider/${shape}/${count}`,
        dimensions: ['Provider 依赖解析', shape, `${count}节点`],
      },
      () => {
        const keys: Array<CoreProviderKey> = Array.from({ length: count }, (_, index) => ({
          capability: ProviderCapability.Pattern,
          name: `pattern-${index}`,
        }));
        // 固定成本作者工厂，避免把图案领域的生成开销混入依赖图解析
        const definitions = keys.map((_, index) => definePattern({ name: `pattern-${index}`, emit: () => [] }));
        const providers: Array<CoreDependencyProvider> = keys.map((key, index) => {
          let dependencies: Array<CoreProviderKey> = [];
          if (shape === 'chain' && index > 0) dependencies = [keys[index - 1]];
          if (shape === 'wide' && index === count - 1) dependencies = keys.slice(0, -1);
          if (shape === 'diamond' || shape === 'duplicates') {
            if (index === count - 1) dependencies = keys.slice(1, -1);
            else if (index > 0) dependencies = [keys[0]];
          }
          return { key, dependencies, makeDefinition: () => definitions[index] };
        });
        const contribution: CoreProviderContribution = { roots: [keys[count - 1]], providers };
        const contributions = shape === 'duplicates' ? Array.from({ length: 8 }, () => contribution) : [contribution];
        return {
          run: () => resolveCoreProviderDependencies({ contributions }),
          verify: result => {
            expect(result.patterns).toHaveLength(count);
            // 这些 fixture 的合法依赖优先序均为递增序，且每个定义只输出一次
            result.patterns?.forEach((definition, index) => expect(definition).toBe(definitions[index]));
            expect(Object.isFrozen(result)).toBe(true);
            expect(Object.isFrozen(result.patterns)).toBe(true);
          },
        };
      },
    );
  }
}
