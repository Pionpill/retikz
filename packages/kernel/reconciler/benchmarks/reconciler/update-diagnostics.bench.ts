import type { IRNode, IRPath, IRScene } from '@retikz/core';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createBenchmarkNode } from './_execution';
import { createUpdateBenchmark } from './_update';
import { createUpdateWorkload, updateChild } from './_update-workload';

for (const count of [100, 1000])
  for (const strategy of ['auto', 'full'] as const)
    defineBenchmark(
      {
        id: `reconciler/update/scene/diagnostics/${count}/${strategy}`,
        dimensions: ['增量更新', 'scene', 'N条缺失引用诊断；无关节点移动', `${count}路径+1节点`, strategy],
      },
      () => {
        const node = createBenchmarkNode(0);
        const next: IRNode = { ...node, position: [10, 20] };
        const paths: Array<IRPath> = Array.from({ length: count }, (_, index) => ({
          type: 'path',
          id: `path-${index}`,
          children: [
            { type: 'step', kind: 'move', to: { id: `missing-${index}` } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        }));
        const createScene = (origin: IRNode): IRScene => ({ type: 'scene', version: 1, children: [origin, ...paths] });
        const workload = createUpdateWorkload(
          [createScene(node), createScene(next)],
          root => [[updateChild(root, 0, next)], [updateChild(root, 0, node)]],
          1,
        );
        return createUpdateBenchmark(workload, strategy, { allowDiagnostics: true });
      },
      false,
      600_000,
    );
