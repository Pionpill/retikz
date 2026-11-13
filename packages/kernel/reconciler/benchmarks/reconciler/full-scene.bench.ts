import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createCompileWorkload } from './_workload';

for (const count of [100, 500, 1000]) {
  defineBenchmark(
    {
      id: `reconciler/full/scene/mixed/${count}`,
      dimensions: ['非增量全量', 'scene', '两层流程图', `${count} 节点＋${count * 1.2} 路径`, '首次编译'],
    },
    () => createReconcilerBenchmark(createCompileWorkload(count), false, {}),
    false,
    600_000,
  );
}
