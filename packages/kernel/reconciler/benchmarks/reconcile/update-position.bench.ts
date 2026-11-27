import { createPositionUpdate, positionGeometries } from './_position-workloads';
import { defineUpdateBenchmarks } from './_update';

defineUpdateBenchmarks(
  'path',
  positionGeometries.flatMap(geometry =>
    (['position', 'equal', 'geometry'] as const).map(change => ({
      kind: `position-${geometry}-${change}`,
      label: `length/${geometry}；每条4段、1个mark；${{ position: '单mark位置往返', equal: '单路径等值替换', geometry: '单路径曲线变化' }[change]}`,
      create: (count: number) => createPositionUpdate(count, geometry, change),
    })),
  ),
);
