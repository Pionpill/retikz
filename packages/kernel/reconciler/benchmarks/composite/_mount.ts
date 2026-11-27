import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from '../reconcile/_execution';
import { compositeCompileOptions, createCompositeWorkload } from './_cell';
import { generatedOptions, createGeneratedMount } from './_generated';

/** 注册指定会话模式的四种 Composite 首屏场景 */
export const defineCompositeMount = (phase: 'full' | 'mount') => {
  for (const count of [100, 1000, 10000]) {
    for (const kind of ['direct', 'replay', 'collection', 'layout'] as const) {
      const cell = kind === 'direct' || kind === 'replay';
      const options = cell ? compositeCompileOptions : generatedOptions;
      const scale = cell ? `${count} 个作者实例` : `1 个实例生成 ${count} 项`;
      defineBenchmark(
        {
          id: `reconciler/${phase}/composite/${kind}/${count}`,
          dimensions: [phase === 'full' ? '非增量全量' : '增量首屏', 'composite', kind, scale, '首次编译'],
          workloadSize: count,
        },
        () =>
          createReconcilerBenchmark(
            cell ? createCompositeWorkload(count, kind === 'replay') : createGeneratedMount(count, kind),
            phase === 'mount',
            options,
          ),
        false,
        600_000,
      );
    }
  }
};
