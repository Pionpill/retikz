import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createNodeWorkload, nodeBenchmarkCases } from './_node-workloads';

for (const { kind, label } of nodeBenchmarkCases) {
  for (const count of [100, 1000]) {
    defineBenchmark(
      {
        id: `reconciler/mount/node/${kind}/${count}`,
        dimensions: ['增量首屏', 'node', label, `${count} 节点`, '首次编译'],
      },
      () => createReconcilerBenchmark(createNodeWorkload(kind, count), true),
      false,
      600_000,
    );
  }
}
