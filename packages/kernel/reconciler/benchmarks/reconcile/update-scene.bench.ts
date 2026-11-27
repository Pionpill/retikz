import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import type { UpdateBenchmarkCase } from './_update-workload';
import { createUpdateScene, createUpdateWorkload, updateChild } from './_update-workload';

/** N 节点和 N−1 条相邻连线；ID 只负责节点引用，操作地址按直接子元素定位 */
const createConnectedScene = (count: number) => {
  const nodes: Array<IRNode> = Array.from({ length: count }, (_, index) => ({
    ...createBenchmarkNode(index),
    id: `node-${index}`,
  }));
  const paths: Array<IRPath> = Array.from({ length: count - 1 }, (_, index) => ({
    type: 'path',
    id: `edge-${index}`,
    style: { stroke: '#334155' },
    children: [
      { type: 'step', kind: 'move', to: { id: `node-${index}` } },
      { type: 'step', kind: 'line', to: { id: `node-${index + 1}` } },
    ],
  }));
  return { nodes, paths };
};

/** 混合场景覆盖真实局部更新、批量、范围、结构和空批次 */
const sceneUpdateCases: ReadonlyArray<UpdateBenchmarkCase> = [
  ...(['move', 'batch'] as const).map(kind => ({
    kind,
    label: kind === 'move' ? '移动中间节点并传播到两条连线' : '移动连续 10% 节点及关联连线',
    create: (count: number) => {
      const { nodes, paths } = createConnectedScene(count);
      const start = Math.floor(count / 2);
      const size = kind === 'move' ? 1 : Math.max(1, Math.floor(count / 10));
      const indices = Array.from({ length: size }, (_, index) => start + index);
      const next = nodes.map((node, index): IRNode =>
        indices.includes(index) ? { ...node, position: [(index % 20) * 500 + 3, Math.floor(index / 20) * 300] } : node,
      );
      return createUpdateWorkload(
        [createUpdateScene([...nodes, ...paths]), createUpdateScene([...next, ...paths])],
        rootId => [
          indices.map(index => updateChild(rootId, index, next[index])),
          indices.map(index => updateChild(rootId, index, nodes[index])),
        ],
        size,
      );
    },
  })),
  {
    kind: 'scope',
    label: '混合 Scope 范围填色更新',
    create: count => {
      const { nodes, paths } = createConnectedScene(count);
      const children = [...nodes.map(node => ({ ...node, style: { stroke: '#334155' } })), ...paths];
      const scope = { type: 'scope' as const, children };
      const own: Omit<IRScope, 'children'> = { type: 'scope', defaults: { node: { style: { fill: '#ef4444' } } } };
      return createUpdateWorkload(
        [createUpdateScene([scope]), createUpdateScene([{ ...own, children }])],
        rootId => [[updateChild(rootId, 0, own)], [updateChild(rootId, 0, { type: 'scope' })]],
        1,
      );
    },
  },
  {
    kind: 'structure',
    label: '插入/删除一个节点和一条连线',
    create: count => {
      const { nodes, paths } = createConnectedScene(count);
      const initial = createUpdateScene([...nodes, ...paths]);
      const node: IRNode = { ...createBenchmarkNode(count), id: 'inserted' };
      const path: IRPath = {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: `node-${count - 1}` } },
          { type: 'step', kind: 'line', to: { id: 'inserted' } },
        ],
      };
      const index = initial.children.length;
      return createUpdateWorkload(
        [initial, createUpdateScene([...initial.children, node, path])],
        rootId => [
          [{ kind: 'insert', parentId: rootId, index, elements: [node, path] }],
          [
            { kind: 'remove', target: { kind: 'child', scopeId: rootId, index: index + 1 } },
            { kind: 'remove', target: { kind: 'child', scopeId: rootId, index } },
          ],
        ],
        2,
      );
    },
  },
  {
    kind: 'empty',
    label: '空批次快速返回，非等值输入提交',
    create: count => {
      const { nodes, paths } = createConnectedScene(count);
      const scene = createUpdateScene([...nodes, ...paths]);
      return createUpdateWorkload([scene, scene], () => [[], []], 0, 'empty');
    },
  },
];

defineUpdateBenchmarks('scene', sceneUpdateCases);
