import { normalizeScene, scene, scope, path } from '@retikz/vanilla';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { pathScene } from '../_scene-workloads';

for (const count of [32, 256]) {
  const ir = pathScene(count);
  for (const form of ['flat', 'nested', 'one-shorthand', 'all-shorthand']) {
    const authored = ir.children.map((child, i) =>
      form === 'all-shorthand' || (form === 'one-shorthand' && i === count - 1)
        ? path({
            way: [
              [0, 0],
              [1, 0],
            ],
          })
        : child,
    );
    const outer = scope({}, [scope({}, authored)]);
    const input = scene(form === 'flat' ? authored : [outer]);
    defineBenchmark({ id: form + '/' + count, dimensions: ['归一化', form, count + ' 路径'] }, () => ({
      run: () => normalizeScene(input),
      verify: result => {
        if (form === 'flat') expect(result.ir.children).toEqual(ir.children);
        else if (form === 'nested') expect(result.ir.children[0]).toBe(outer);
        else {
          expect(result.ir.children[0]).not.toBe(outer);
          expect(result.ir.children[0]).toMatchObject({
            type: 'scope',
            children: [
              {
                type: 'scope',
                children: expect.arrayContaining([
                  {
                    type: 'path',
                    children: [
                      { type: 'step', kind: 'move', to: [0, 0] },
                      { type: 'step', kind: 'line', to: [1, 0] },
                    ],
                  },
                ]),
              },
            ],
          });
        }
      },
    }));
  }
}
