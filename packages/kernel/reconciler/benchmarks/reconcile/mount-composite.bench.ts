import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { compositeCompileOptions, createCompositeWorkload } from './_composite-workloads';
import { createReconcilerBenchmark } from './_execution';

for (const count of [100, 1000])
  for (const replay of [false, true])
    defineBenchmark(
      {
        id: `reconciler/mount/composite/${replay ? 'replay' : 'direct'}/${count}`,
        dimensions: [
          '增量首屏',
          'composite',
          replay ? 'layoutChild+replay' : '直接展开',
          `${count}复合实例+支撑节点`,
          '首次编译',
        ],
      },
      () => createReconcilerBenchmark(createCompositeWorkload(count, replay), true, compositeCompileOptions),
      false,
      600_000,
    );
