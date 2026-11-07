import { SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createCompileWorkload } from '../_compile-workload';

for (const count of [100, 500, 1000]) {
  defineBenchmark(
    {
      id: `compile/full/mixed/${count}`,
      dimensions: [
        '完整 SceneReconciler，无 provenance',
        '两层流程图，固定形状与路径比例',
        `${count}节点 / ${count * 1.2}路径`,
      ],
    },
    () => {
      const workload = createCompileWorkload(count);
      let warningCount = 0;
      const options = {
        onWarn: () => {
          warningCount++;
        },
      };
      return {
        run: () =>
          (() => {
            const reconciler = new SceneReconciler(options, { incremental: false });
            try {
              return reconciler.mount(workload.ir).compilation.result;
            } finally {
              reconciler.dispose();
            }
          })(),
        verify: result => {
          expect(warningCount).toBe(0);
          workload.verify(result);
        },
      };
    },
  );
}
