import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createScopeWorkload, scopeBenchmarkCases } from './_scope-workloads';

for (const { kind, label } of scopeBenchmarkCases) {
  for (const count of [100, 1000]) {
    const size =
      kind === 'empty'
        ? `${count} 空 Scope`
        : `${kind === 'paths' ? 0 : count} 节点＋${kind === 'paths' || kind === 'mixed' ? count : 0} 路径`;
    defineBenchmark(
      { id: `reconciler/full/scope/${kind}/${count}`, dimensions: ['非增量全量', 'scope', label, size, '首次编译'] },
      () => createReconcilerBenchmark(createScopeWorkload(kind, count), false),
      false,
      600_000,
    );
  }
}
