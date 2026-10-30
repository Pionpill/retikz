import { compileToScene } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createCompileWorkload } from '../_compile-workload';

for (const count of [100, 500, 1000]) {
  defineBenchmark(
    {
      id: `compile/full/mixed/${count}`,
      dimensions: [
        '完整 compileToScene，无 provenance',
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
        run: () => compileToScene(workload.ir, options),
        verify: result => {
          expect(warningCount).toBe(0);
          workload.verify(result);
        },
      };
    },
  );
}
