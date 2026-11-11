import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createPositionWorkload, positionGeometries } from './_position-workloads';

for (const geometry of positionGeometries)
  for (const count of [100, 1000])
    defineBenchmark(
      {
        id: `reconciler/mount/path/position-${geometry}/${count}`,
        dimensions: ['增量首屏', 'path', `length/${geometry}`, `${count}路径；每条4段、1个mark`, '首次挂载'],
      },
      () => createReconcilerBenchmark(createPositionWorkload(count, geometry), true),
      false,
      600_000,
    );
