import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createPathWorkload, pathBenchmarkCases, pathUsesNodes } from './_path-workloads';

for (const entry of pathBenchmarkCases) {
  for (const count of [100, 1000]) {
    defineBenchmark(
      {
        id: `reconciler/full/path/${entry.kind}/${count}`,
        dimensions: [
          '非增量全量',
          'path',
          entry.label,
          `${count} 路径${pathUsesNodes(entry.kind) ? `＋${count * 2} 支撑节点` : ''}；每条 ${entry.segments} 段或过点`,
          '首次编译',
        ],
      },
      () => createReconcilerBenchmark(createPathWorkload(entry, count), false),
      false,
      // 执行时限独立于 P90 预算，不削减复杂路径的固定采样轮次
      600_000,
    );
  }
}
