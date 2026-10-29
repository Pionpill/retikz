import { visitSceneContent } from '@retikz/core';
import type { Scene, ScenePrimitive, SceneResource } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

for (const count of [100, 1_000]) {
  for (const shape of ['flat', 'nested', 'shared', 'distinct'] as const) {
    for (const mode of ['validate', 'visit'] as const) {
      defineBenchmark(
        {
          id: `contract/scene/${shape}-${mode}/${count}`,
          dimensions: ['Scene 内容遍历', `${shape}/${mode}`, `${count}宿主`],
        },
        () => {
          const resources: Array<SceneResource> = [];
          const primitives: Array<ScenePrimitive> = [];
          const hasPattern = shape === 'shared' || shape === 'distinct';
          const resourceCount = shape === 'shared' ? 1 : shape === 'distinct' ? count : 0;
          for (let index = 0; index < resourceCount; index++) {
            resources.push({
              kind: 'paint',
              id: `paint-${index}`,
              spec: { kind: 'pattern', shape: 'benchmark' },
              tile: {
                size: 8,
                motif: Array.from({ length: 8 }, (_, x) => ({ type: 'rect', x, y: 0, width: 1, height: 1 })),
              },
            });
          }
          for (let index = 0; index < count; index++) {
            let primitive: ScenePrimitive = {
              type: 'rect',
              id: `host-${index}`,
              x: index,
              y: 0,
              width: 1,
              height: 1,
              ...(hasPattern
                ? { fill: { kind: 'resourceRef' as const, id: `paint-${shape === 'shared' ? 0 : index}` } }
                : {}),
            };
            if (shape === 'nested') {
              for (let depth = 0; depth < 8; depth++) primitive = { type: 'group', children: [primitive] };
            }
            primitives.push(primitive);
          }
          const scene: Pick<Scene, 'primitives' | 'resources'> = { primitives, resources };
          const before = structuredClone(scene);
          const expectedVisits = count * (shape === 'flat' ? 1 : 9);
          return {
            run: () => {
              if (mode === 'validate') {
                visitSceneContent(scene);
                return undefined;
              }
              let visits = 0;
              let resourceVisits = 0;
              visitSceneContent(scene, (_, context) => {
                visits++;
                if (context.isResourceContent) resourceVisits++;
              });
              return { visits, resourceVisits };
            },
            verify: result => {
              if (mode === 'visit') {
                expect(result).toEqual({ visits: expectedVisits, resourceVisits: hasPattern ? count * 8 : 0 });
              } else {
                expect(result).toBeUndefined();
                // 无返回值的校验入口依靠既有缺失/循环引用功能测试保障，避免断言再执行一次算法
              }
              expect(scene).toEqual(before);
            },
          };
        },
      );
    }
  }
}
