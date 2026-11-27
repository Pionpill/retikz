import { SceneRuntime } from '@retikz/vanilla';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { sceneCases } from '../_mixed-workloads';

for (const spec of sceneCases) {
  const { label, size } = spec;
  defineBenchmark(
    {
      workloadSize: Math.max(spec.nodes, spec.paths, spec.scopes),
      id: 'mount/' + label + '/' + size,
      dimensions: ['增量编译（无宿主初始帧）', label, size],
    },
    () => {
      const workload = spec.create();
      let runtime: SceneRuntime;
      return {
        run: () => {
          runtime = new SceneRuntime(workload.ir, { reconciler: { mode: 'incremental' } });
          return runtime.current.compilation.result;
        },
        afterEach: () => runtime.dispose(),
        verify: workload.verify,
      };
    },
    false,
    600000,
  );
}
