import type { IRNode, IRScene, IRScope } from '@retikz/core';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { createBenchmarkNode } from './_execution';
import { createUpdateBenchmark } from './_update';
import { createUpdateWorkload, updateChild } from './_update-workload';
import type { UpdateBenchmarkCase } from './_update-workload';

const cases: ReadonlyArray<UpdateBenchmarkCase> = [
  {
    kind: 'last-paint',
    label: '删除最后渐变消费者，保留清洁兄弟',
    create: count => {
      const nodes = Array.from({ length: count }, (_, index) => createBenchmarkNode(index));
      const painted: IRNode = {
        ...createBenchmarkNode(count),
        style: {
          fill: {
            kind: 'linearGradient',
            angle: 0,
            stops: [
              { offset: 0, color: '#ff0000' },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      };
      const first: IRScene = { type: 'scene', version: 1, children: [...nodes, painted] };
      const second: IRScene = { ...first, children: nodes };
      return createUpdateWorkload(
        [first, second],
        root => [
          [{ kind: 'remove', target: { kind: 'child', scopeId: root, index: count } }],
          [{ kind: 'insert', parentId: root, index: count, elements: [painted] }],
        ],
        1,
      );
    },
  },
  {
    kind: 'clip',
    label: 'Scope裁剪更新，后代绘制贡献保留',
    create: count => {
      const children = Array.from({ length: count }, (_, index) => createBenchmarkNode(index));
      const scope: IRScope = {
        type: 'scope',
        id: 'container',
        clip: { kind: 'rect', params: { x: -50, y: -50, width: 10000, height: 10000 } },
        children,
      };
      const next: IRScope = { ...scope, clip: { kind: 'rect', params: { x: -50, y: -50, width: 500, height: 500 } } };
      const { children: ignoredFirst, ...firstOwn } = scope;
      const { children: ignoredSecond, ...secondOwn } = next;
      void ignoredFirst;
      void ignoredSecond;
      return createUpdateWorkload(
        [
          { type: 'scene', version: 1, children: [scope] },
          { type: 'scene', version: 1, children: [next] },
        ],
        root => [[updateChild(root, 0, secondOwn)], [updateChild(root, 0, firstOwn)]],
        1,
      );
    },
  },
];
for (const entry of cases)
  for (const count of [100, 1000])
    for (const captureProvenance of [false, true])
      for (const strategy of ['auto', 'full'] as const)
        defineBenchmark(
          {
            id: `reconciler/update/scope/${entry.kind}-provenance-${captureProvenance}/${count}/${strategy}`,
            dimensions: [
              '增量更新',
              'scope',
              `${entry.label}；provenance=${captureProvenance}`,
              `${count}背景节点`,
              strategy,
            ],
          },
          () => createUpdateBenchmark(entry.create(count), strategy, { captureProvenance }),
          false,
          600_000,
        );
