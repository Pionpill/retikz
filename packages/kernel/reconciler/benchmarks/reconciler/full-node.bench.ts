import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createNodeWorkload, nodeBenchmarkCases } from './_node-workloads';

for (const { kind, label } of nodeBenchmarkCases) {
  for (const count of [100, 1000]) {
    defineBenchmark(
      {
        id: `reconciler/full/node/${kind}/${count}`,
        dimensions: ['非增量全量', 'node', label, `${count} 节点`, '首次编译'],
      },
      () => createReconcilerBenchmark(createNodeWorkload(kind, count), false),
      false,
      600_000,
    );
  }
}
