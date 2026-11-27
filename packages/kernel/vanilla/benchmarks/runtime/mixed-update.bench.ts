import type { WeaveBatch } from '@retikz/reconciler';
import { SceneRuntime } from '@retikz/vanilla';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { connectedWorkload } from '../_mixed-workloads';

for (const count of [100, 1000]) {
  defineBenchmark(
    {
      id: 'move-middle/' + count,
      dimensions: ['会话', 'update(batch) / 移动中间节点', count + ' Node + ' + (count - 1) + ' Path'],
    },
    () => {
      const { ir, nodes } = connectedWorkload(count, 'chain');
      const index = Math.floor(count / 2);
      const current = nodes[index];
      const moved = {
        ...current,
        position: [20 + (index % 25) * 28, 27 + Math.floor(index / 25) * 18] as [number, number],
      };
      const runtime = new SceneRuntime(ir, { reconciler: { mode: 'incremental' } });
      const target = { kind: 'id' as const, id: current.id!, scopeId: runtime.getScopeId([], runtime.current) };
      const forward: WeaveBatch = { operations: [{ kind: 'update', target, input: moved }] };
      const reverse: WeaveBatch = { operations: [{ kind: 'update', target, input: current }] };
      const before = runtime.current.compilation.result.scene.primitives;
      const changedIds = new Set([current.id, 'edge-' + (index - 1), 'edge-' + index]);
      return {
        run: () => {
          runtime.update(forward);
          return runtime.current.compilation.result.scene.primitives;
        },
        afterEach: () => runtime.update(reverse),
        verify: after => {
          expect(after.length).toBe(before.length);
          const observed = new Set<string>();
          after.forEach((primitive, i) => {
            if (primitive.id && changedIds.has(primitive.id)) {
              observed.add(primitive.id);
              if (primitive.type === 'path') {
                expect(before[i]).not.toMatchObject({ commands: primitive.commands });
              } else expect(primitive).not.toEqual(before[i]);
            } else expect(primitive).toEqual(before[i]);
          });
          expect(observed).toEqual(changedIds);
        },
        dispose: () => runtime.dispose(),
      };
    },
    false,
    600000,
  );
}
