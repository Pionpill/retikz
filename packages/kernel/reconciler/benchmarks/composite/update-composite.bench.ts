import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createUpdateBenchmark } from '../reconcile/_update';
import type { UpdateBenchmarkWorkload } from '../reconcile/_update-workload';
import { compositeCompileOptions, createCompositeUpdate } from './_cell';
import { generatedOptions, createGeneratedUpdate } from './_generated';

for (const count of [100, 1000, 10000]) {
  for (const kind of ['direct', 'replay', 'collection', 'layout'] as const) {
    const cell = kind === 'direct' || kind === 'replay';
    const options = cell ? compositeCompileOptions : generatedOptions;
    const scale = cell ? `${count} 个作者实例` : `1 个实例生成 ${count} 项`;
    const registerUpdate = (change: string, workload: () => UpdateBenchmarkWorkload) => {
      defineBenchmark(
        {
          id: `reconciler/update/composite/${kind}-${change}/${count}/auto`,
          dimensions: ['增量更新', 'composite', kind + ' / ' + change, scale, 'auto'],
          workloadSize: count,
        },
        () => createUpdateBenchmark(workload(), 'auto', { compileOptions: options }),
        false,
        600_000,
      );
    };
    if (cell) {
      for (const change of ['paint', 'position', 'instance'] as const)
        registerUpdate(change, () => createCompositeUpdate(count, kind === 'replay', change));
    } else if (kind === 'collection') {
      for (const change of ['equal', 'paint', 'width'] as const)
        registerUpdate(change, () => createGeneratedUpdate(count, kind, change));
    } else {
      for (const change of ['paint', 'position'] as const)
        registerUpdate(change, () => createGeneratedUpdate(count, kind, change));
    }
  }
}
