import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveScopeDefaults } from '../../src/resolve/style';
import type { IRScope } from '../../src/schemas';

for (const kind of ['inherit', 'merge', 'reset'] as const) {
  defineBenchmark(
    { id: `resolve/defaults/${kind}`, dimensions: ['Scope 默认值', kind, '单层，node/path 通道'] },
    () => {
      const parent = resolveScopeDefaults({
        defaults: { style: { stroke: 'blue' }, node: { layout: { padding: 3 } }, path: { style: { strokeWidth: 2 } } },
      });
      const source: Pick<IRScope, 'defaults'> =
        kind === 'inherit'
          ? {}
          : {
              defaults: {
                ...(kind === 'reset' ? { reset: ['node'] } : {}),
                node: { style: { fill: 'red' } },
              },
            };
      const original = JSON.stringify(parent);
      return {
        run: () => resolveScopeDefaults(source, parent),
        verify: result => {
          if (kind === 'inherit') expect(result).toBe(parent);
          else {
            expect(result.node?.style.fill).toBe('red');
            expect(result.node?.style.stroke).toBe(kind === 'reset' ? undefined : 'blue');
            expect(result.node?.layout.padding).toBe(kind === 'reset' ? undefined : 3);
          }
          expect(result.path?.style).toMatchObject({ stroke: 'blue', strokeWidth: 2 });
          expect(JSON.stringify(parent)).toBe(original);
        },
      };
    },
  );
}
