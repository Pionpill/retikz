import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { compositeCompileOptions, createCompositeUpdate } from './_composite-workloads';
import { createUpdateBenchmark } from './_update';

for (const count of [100, 1000])
  for (const replay of [false, true])
    for (const change of ['paint', 'position'] as const)
      for (const strategy of ['auto', 'full'] as const)
        defineBenchmark(
          {
            id: `reconciler/update/composite/${replay ? 'replay' : 'direct'}-${change}/${count}/${strategy}`,
            dimensions: [
              '增量更新',
              'composite',
              `${replay ? 'layoutChild+replay' : '直接展开'}；外部${change}`,
              `${count}复合实例`,
              strategy,
            ],
          },
          () =>
            createUpdateBenchmark(createCompositeUpdate(count, replay, change), strategy, {
              compileOptions: compositeCompileOptions,
            }),
          false,
          600_000,
        );
