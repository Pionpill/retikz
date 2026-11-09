import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createScopeWorkload, scopeBenchmarkCases } from './_scope-workloads';

for (const { kind, label } of scopeBenchmarkCases) {
  for (const count of [100, 1000]) {
    const size =
      kind === 'empty'
        ? `${count} 空 Scope，无叶元素`
        : `${kind === 'paths' ? 0 : count} 节点＋${kind === 'paths' || kind === 'mixed' ? count : 0} 路径`;
    defineBenchmark({ id: `reconciler/scope/${kind}/${count}`, dimensions: ['Scope 完整编译', label, size] }, () =>
      createReconcilerBenchmark(createScopeWorkload(kind, count)),
    );
  }
}
