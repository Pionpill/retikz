import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createNodeWorkload, nodeBenchmarkCases } from './_node-workloads';

for (const { kind, label } of nodeBenchmarkCases) {
  for (const count of [100, 1000]) {
    defineBenchmark(
      { id: `reconciler/node/${kind}/${count}`, dimensions: ['Node 完整编译', label, `${count} 节点`] },
      () => createReconcilerBenchmark(createNodeWorkload(kind, count)),
    );
  }
}
