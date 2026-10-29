import { createCompositeInputBindings } from '@retikz/core';
import type { CompositeInputBinding, CompositeInputPath, IRComposite, IRScene } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  captureCompositeInputScope,
  resolveCompositeInputScope,
  selectCompositeInputScope,
} from '../../src/contract/composite';

for (const count of [100, 1_000]) {
  for (const shape of ['sparse', 'dense', 'deep'] as const) {
    for (const operation of ['capture', 'resolve', 'select'] as const) {
      defineBenchmark(
        {
          id: `contract/composite/${operation}-${shape}/${count}`,
          dimensions: ['Composite 输入绑定', `${operation}/${shape}`, `${count}项Source`],
        },
        () => {
          const children: Array<IRComposite> = [];
          const bindings: Array<CompositeInputBinding> = [];
          const depth = shape === 'deep' ? 8 : 0;
          const suffix: Array<string> = Array.from({ length: depth }, () => 'child');
          for (let index = 0; index < count; index++) {
            let child: IRComposite = { namespace: 'bench', type: 'item', value: index };
            for (let level = 0; level < depth; level++) child = { namespace: 'bench', type: 'wrapper', child };
            children.push(child);
            if (shape !== 'sparse' || index % 16 === 0) {
              bindings.push({ path: ['children', index, ...suffix], input: { row: index } });
            }
          }
          const source: IRScene = { type: 'scene', version: 1, children };
          const before = structuredClone(source);
          const path: CompositeInputPath = ['children', 0, ...suffix];
          const scope = operation === 'select' ? captureCompositeInputScope(source, bindings) : undefined;
          const handle = operation === 'resolve' ? createCompositeInputBindings(source, bindings) : undefined;
          const expectedLeaf = { namespace: 'bench', type: 'item', value: 0 };
          return {
            run: () => {
              if (operation === 'capture') return captureCompositeInputScope(source, bindings);
              if (operation === 'resolve') return resolveCompositeInputScope(source, handle);
              return selectCompositeInputScope(scope!, path);
            },
            verify: result => {
              if (operation === 'select') {
                expect(result.source).toEqual(expectedLeaf);
                expect(result.sourcePath).toEqual(path);
                expect(result.bindings).toEqual([{ path: [], input: bindings[0].input }]);
                expect(result.bindings[0].input).toBe(bindings[0].input);
              } else {
                expect(result.source).toEqual(source);
                expect(result.source).not.toBe(source);
                expect(result.bindings).toHaveLength(bindings.length);
                expect(Object.isFrozen(result.source)).toBe(true);
                expect(Object.isFrozen(result.bindings)).toBe(true);
                result.bindings.forEach((binding, index) => {
                  expect(binding.path).toEqual(bindings[index].path);
                  expect(binding.input).toBe(bindings[index].input);
                });
              }
              expect(source).toEqual(before);
            },
          };
        },
      );
    }
  }
}
