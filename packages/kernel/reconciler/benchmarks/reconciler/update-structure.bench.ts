import type { IRNode, IRPath, IRScene, IRScope } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import { createUpdateWorkload, updateChild } from './_update-workload';
import type { UpdateBenchmarkCase } from './_update-workload';

const cases: ReadonlyArray<UpdateBenchmarkCase> = [
  ...(['head', 'middle', 'nested'] as const).map(location => ({
    kind: `insert-${location}`,
    label: `${location} 插入/删除单节点，后续声明地址移动`,
    create: (count: number) => {
      const nodes = Array.from({ length: count }, (_, index) => ({
        ...createBenchmarkNode(index),
        id: `node-${index}`,
      }));
      const inserted: IRNode = { ...createBenchmarkNode(count), id: 'inserted' };
      const index = location === 'head' ? 0 : Math.floor(count / 2);
      const children = [...nodes.slice(0, index), inserted, ...nodes.slice(index)];
      const createScene = (items: Array<IRNode>): IRScene => ({
        type: 'scene',
        version: 1,
        children: location === 'nested' ? [{ type: 'scope', id: 'container', children: items }] : items,
      });
      return createUpdateWorkload(
        [createScene(nodes), createScene(children)],
        (root, scopeIdAt) => {
          const parentId = location === 'nested' ? scopeIdAt([0]) : root;
          return [
            [{ kind: 'insert', parentId, index, elements: [inserted] }],
            [{ kind: 'remove', target: { kind: 'child', scopeId: parentId, index } }],
          ];
        },
        1,
      );
    },
  })),
  {
    kind: 'rename',
    label: '同批重命名生产者与切换消费者',
    create: count => {
      const original: IRNode = { ...createBenchmarkNode(0), id: 'origin' };
      const next: IRNode = { ...original, id: 'renamed' };
      const createPath = (name: string): IRPath => ({
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: { id: name } },
          { type: 'step', kind: 'line', to: [200, 0] },
        ],
      });
      const firstPath = createPath('origin');
      const secondPath = createPath('renamed');
      const background = Array.from({ length: count }, (_, index) => createBenchmarkNode(index + 1));
      const createScene = (node: IRNode, edge: IRPath): IRScene => ({
        type: 'scene',
        version: 1,
        children: [node, edge, ...background],
      });
      return createUpdateWorkload(
        [createScene(original, firstPath), createScene(next, secondPath)],
        root => [
          [updateChild(root, 0, next), updateChild(root, 1, secondPath)],
          [updateChild(root, 0, original), updateChild(root, 1, firstPath)],
        ],
        2,
      );
    },
  },
  {
    kind: 'alias',
    label: '别名新增与消费者切换，主id稳定',
    create: count => {
      const original: IRNode = { ...createBenchmarkNode(0), id: 'origin' };
      const next: IRNode = { ...original, aliasIds: ['alias'] };
      const createPath = (name: string): IRPath => ({
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: name } },
          { type: 'step', kind: 'line', to: [200, 0] },
        ],
      });
      const first = createPath('origin');
      const second = createPath('alias');
      const background = Array.from({ length: count }, (_, index) => createBenchmarkNode(index + 1));
      const createScene = (node: IRNode, path: IRPath): IRScene => ({
        type: 'scene',
        version: 1,
        children: [node, path, ...background],
      });
      return createUpdateWorkload(
        [createScene(original, first), createScene(next, second)],
        root => [
          [updateChild(root, 0, next), updateChild(root, 1, second)],
          [updateChild(root, 0, original), updateChild(root, 1, first)],
        ],
        2,
        'equal',
      );
    },
  },
  {
    kind: 'namespace',
    label: '独立Scope命名空间开关；无重名的等值输出',
    create: count => {
      const children = Array.from({ length: count }, (_, index) => ({
        ...createBenchmarkNode(index),
        id: `node-${index}`,
      }));
      const original: IRScope = { type: 'scope', id: 'container', children };
      const next: IRScope = { ...original, localNamespace: true };
      return createUpdateWorkload(
        [
          { type: 'scene', version: 1, children: [original] },
          { type: 'scene', version: 1, children: [next] },
        ],
        root => [
          [updateChild(root, 0, { type: 'scope', id: 'container', localNamespace: true })],
          [updateChild(root, 0, { type: 'scope', id: 'container' })],
        ],
        1,
        'equal',
      );
    },
  },
  {
    kind: 'shadow',
    label: '局部同名生产者改名，消费者重新绑定外层',
    create: count => {
      const outside: IRNode = { ...createBenchmarkNode(0), id: 'anchor' };
      const local: IRNode = { ...createBenchmarkNode(1), id: 'anchor' };
      const renamed: IRNode = { ...local, id: 'other' };
      const consumer: IRNode = {
        ...createBenchmarkNode(2),
        position: { of: 'anchor', direction: 'right', distance: 10 },
      };
      const background = Array.from({ length: count }, (_, index) => createBenchmarkNode(index + 3));
      const createScene = (anchor: IRNode): IRScene => ({
        type: 'scene',
        version: 1,
        children: [outside, { type: 'scope', localNamespace: true, children: [anchor, consumer, ...background] }],
      });
      return createUpdateWorkload(
        [createScene(local), createScene(renamed)],
        (_, scopeIdAt) => {
          const parent = scopeIdAt([1]);
          return [[updateChild(parent, 0, renamed)], [updateChild(parent, 0, local)]];
        },
        1,
      );
    },
  },
  {
    kind: 'coalesce',
    label: '同批同一目标连续两次更新，只消费最终输入',
    create: count => {
      const nodes = Array.from({ length: count }, (_, index) => createBenchmarkNode(index));
      const middle: IRNode = { ...nodes[0], position: [5, 10] };
      const next: IRNode = { ...nodes[0], position: [10, 20] };
      const first: IRScene = { type: 'scene', version: 1, children: nodes };
      return createUpdateWorkload(
        [first, { ...first, children: [next, ...nodes.slice(1)] }],
        root => [
          [updateChild(root, 0, middle), updateChild(root, 0, next)],
          [updateChild(root, 0, middle), updateChild(root, 0, nodes[0])],
        ],
        1,
      );
    },
  },
];

defineUpdateBenchmarks('scene', cases);
