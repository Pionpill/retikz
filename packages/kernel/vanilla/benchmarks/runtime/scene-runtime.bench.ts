import type { WeaveBatch } from '@retikz/reconciler';
import { SceneRuntime } from '@retikz/vanilla';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { pathScene } from '../_scene-workloads';

for (const count of [32, 256]) {
  const ir = pathScene(count);
  for (const operation of ['remove', 'remove-subscribed']) {
    defineBenchmark({ id: operation + '/' + count, dimensions: ['会话', operation, count + ' 路径'] }, () => {
      let runtime: SceneRuntime;
      let batch: WeaveBatch;
      let published: SceneRuntime['current'] | undefined;
      const options = { reconciler: { mode: 'incremental' as const } };
      return {
        beforeEach: () => {
          runtime = new SceneRuntime(ir, options);
          if (operation === 'remove-subscribed') {
            published = undefined;
            runtime.subscribe(result => {
              published = result;
            });
          }
          batch = {
            operations: [
              { kind: 'remove', target: { kind: 'id', id: 'p0', scopeId: runtime.getScopeId([], runtime.current) } },
            ],
          };
        },
        run: () => {
          runtime.update(batch);
          return runtime.current;
        },
        afterEach: () => runtime.dispose(),
        verify: result => {
          expect(result.compilation.result.scene.primitives).toHaveLength(count - 1);
          if (operation === 'remove-subscribed') expect(published).toBe(result);
        },
      };
    });
  }
}
