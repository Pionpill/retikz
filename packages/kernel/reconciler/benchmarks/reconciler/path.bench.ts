import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createPathWorkload, pathBenchmarkCases, pathUsesNodes } from './_path-workloads';

for (const entry of pathBenchmarkCases) {
  for (const count of [100, 1000]) {
    defineBenchmark(
      {
        id: `reconciler/path/${entry.kind}/${count}`,
        dimensions: [
          'Path 完整编译',
          entry.label,
          `${count} 路径${pathUsesNodes(entry.kind) ? `＋${count * 2} 支撑节点` : ''}；每条 ${entry.segments} 段或过点`,
        ],
      },
      () => createReconcilerBenchmark(createPathWorkload(entry, count)),
    );
  }
}
