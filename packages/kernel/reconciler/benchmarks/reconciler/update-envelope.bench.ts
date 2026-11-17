import type { IRNode, IRPath, IRScene, IRScope } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import { createUpdateWorkload, updateChild } from './_update-workload';

/** 后代改变命名Scope包络，外部Path消费边界 */
defineUpdateBenchmarks('scope', [
  {
    kind: 'envelope',
    label: '后代宽度改变命名包络与外部连接',
    create: count => {
      const nodes = Array.from({ length: count }, (_, index) => ({
        ...createBenchmarkNode(index),
        id: `node-${index}`,
      }));
      const next: IRNode = { ...nodes.at(-1)!, layout: { ...nodes.at(-1)!.layout, width: 240 } };
      const scope: IRScope = { type: 'scope', id: 'envelope', children: nodes };
      const path: IRPath = {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'envelope' } },
          { type: 'step', kind: 'line', to: [11000, 0] },
        ],
      };
      const first: IRScene = { type: 'scene', version: 1, children: [scope, path] };
      const second: IRScene = { ...first, children: [{ ...scope, children: [...nodes.slice(0, -1), next] }, path] };
      return createUpdateWorkload(
        [first, second],
        (_, scopeIdAt) => {
          const parent = scopeIdAt([0]);
          return [[updateChild(parent, count - 1, next)], [updateChild(parent, count - 1, nodes.at(-1)!)]];
        },
        1,
      );
    },
  },
]);
