import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createClipRegistry, createPaintRegistry } from '../../src/compile/resource';
import { createClipWorkload, createPaintWorkload, resourceRound } from '../_resource-workloads';
import type { ResourceMode } from '../_resource-workloads';

const modes: Array<ResourceMode> = ['unique', 'same-instance', 'equal-object', 'import'];
const modeLabels = {
  unique: '不同内容',
  'same-instance': '重复实例',
  'equal-object': '等值独立对象',
  import: '导入不同资源',
};

for (const count of [10, 100, 1000]) {
  for (const pattern of [false, true]) {
    for (const mode of modes) {
      defineBenchmark(
        {
          id: `compile/resource/paint-${pattern ? 'pattern8' : 'gradient'}-${mode}/${count}`,
          dimensions: [
            'Paint 注册表完整生命周期',
            `${pattern ? '8图元Pattern' : '2色渐变'} · ${modeLabels[mode]}`,
            `${count}次登记`,
          ],
        },
        () => {
          const workload = createPaintWorkload(count, pattern, mode);
          const prepared = createPaintRegistry(resourceRound);
          if (mode === 'import') for (const input of workload.inputs) prepared.register(input);
          const imported = prepared.getResources();
          workload.resetCalls();
          const expectedCount = mode === 'unique' || mode === 'import' ? count : 1;
          return {
            run: () => {
              const before = workload.calls();
              const registry = createPaintRegistry(resourceRound);
              const ids =
                mode === 'import'
                  ? imported.map(resource => registry.importResource(resource))
                  : workload.inputs.map(input => registry.register(input));
              return { resources: registry.getResources(), ids, calls: workload.calls() - before };
            },
            verify: result => {
              expect(result.resources).toHaveLength(expectedCount);
              expect(result.ids).toHaveLength(count);
              const resourceIds = result.resources.map(resource => resource.id);
              expect(new Set(resourceIds).size).toBe(expectedCount);
              expect(result.ids).toEqual(
                Array.from({ length: count }, (_, index) => ({
                  kind: 'resourceRef',
                  id: resourceIds[expectedCount === 1 ? 0 : index],
                })),
              );
              if (mode === 'import') expect(resourceIds).toEqual(imported.map(resource => resource.id));
              expect(result.calls).toBe(pattern && mode !== 'import' ? expectedCount : 0);
              if (pattern)
                for (const resource of result.resources) {
                  expect('tile' in resource && resource.tile.motif.length).toBe(8);
                }
            },
          };
        },
      );
    }
  }
  for (const complex of [false, true]) {
    for (const mode of modes) {
      defineBenchmark(
        {
          id: `compile/resource/clip-${complex ? 'path32' : 'rect'}-${mode}/${count}`,
          dimensions: [
            'Clip 注册表完整生命周期',
            `${complex ? '32段路径' : '矩形'} · ${modeLabels[mode]}`,
            `${count}次登记`,
          ],
        },
        () => {
          const workload = createClipWorkload(count, complex, mode);
          const prepared = createClipRegistry(resourceRound);
          if (mode === 'import') for (const input of workload.inputs) prepared.register(input);
          const imported = prepared.getResources();
          workload.resetCalls();
          const expectedCount = mode === 'unique' || mode === 'import' ? count : 1;
          return {
            run: () => {
              const before = workload.calls();
              const registry = createClipRegistry(resourceRound);
              const ids =
                mode === 'import'
                  ? imported.map(resource => registry.importResource(resource))
                  : workload.inputs.map(input => registry.register(input));
              return { resources: registry.getResources(), ids, calls: workload.calls() - before };
            },
            verify: result => {
              expect(result.resources).toHaveLength(expectedCount);
              expect(result.ids).toHaveLength(count);
              const resourceIds = result.resources.map(resource => resource.id);
              expect(new Set(resourceIds).size).toBe(expectedCount);
              expect(result.ids).toEqual(
                Array.from({ length: count }, (_, index) => resourceIds[expectedCount === 1 ? 0 : index]),
              );
              if (mode === 'import') expect(resourceIds).toEqual(imported.map(resource => resource.id));
              // Clip 按生成路径去重，重复登记仍执行 lower；这里只记录现有契约
              expect(result.calls).toBe(mode === 'import' ? 0 : count);
              for (const resource of result.resources) expect(resource.path.commands).toHaveLength(complex ? 34 : 5);
            },
          };
        },
      );
    }
  }
}
