import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createReconcilerBenchmark } from './_execution';
import { createPositionWorkload, positionGeometries } from './_position-workloads';

for (const geometry of positionGeometries)
  for (const count of [100, 1000])
    defineBenchmark(
      {
        id: `reconciler/full/path/position-${geometry}/${count}`,
        dimensions: ['非增量全量', 'path', `length/${geometry}`, `${count}路径；每条4段、1个mark`, '首次编译'],
      },
      () => createReconcilerBenchmark(createPositionWorkload(count, geometry), false),
      false,
      600_000,
    );
