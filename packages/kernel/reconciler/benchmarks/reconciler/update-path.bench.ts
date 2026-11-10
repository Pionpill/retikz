import type { IRPath } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import type { UpdateBenchmarkCase } from './_update-workload';
import { createUpdateScene, createUpdateWorkload, updateChild } from './_update-workload';

/** 无节点依赖的路径，控制单路径复杂度；引用传播单列 */
const createUpdatePath = (index: number): IRPath => ({
  type: 'path',
  id: `path-${index}`,
  style: { stroke: '#334155', strokeWidth: 1 },
  children: [
    { type: 'step', kind: 'move', to: [0, index * 100] },
    { type: 'step', kind: 'line', to: [100, index * 100] },
  ],
});

/** 修改一条路径，A/B 场景独立于批次构造 */
const createPathUpdate = (count: number, changePath: (path: IRPath) => IRPath) => {
  const paths = Array.from({ length: count }, (_, index) => createUpdatePath(index));
  const index = Math.floor(count / 2);
  const changed = changePath(paths[index]);
  return createUpdateWorkload(
    [createUpdateScene(paths), createUpdateScene(paths.map((path, position) => (position === index ? changed : path)))],
    rootId => [[updateChild(rootId, index, changed)], [updateChild(rootId, index, paths[index])]],
    1,
  );
};

/** Path 几何与装饰按单一变化拆分，不组合成不可解释的负载 */
const pathUpdateCases: ReadonlyArray<UpdateBenchmarkCase> = [
  {
    kind: 'reference',
    label: '单路径切换引用目标；另含 2N 支撑节点',
    create: count => {
      const nodes = Array.from({ length: count * 2 }, (_, index) => ({
        ...createBenchmarkNode(index),
        id: `node-${index}`,
      }));
      const paths: Array<IRPath> = Array.from({ length: count }, (_, index) => ({
        ...createUpdatePath(index),
        children: [
          { type: 'step', kind: 'move', to: { id: `node-${index * 2}` } },
          { type: 'step', kind: 'line', to: { id: `node-${index * 2 + 1}` } },
        ],
      }));
      const index = Math.floor(count / 2);
      const changed: IRPath = {
        ...paths[index],
        children: [paths[index].children[0], { type: 'step', kind: 'line', to: { id: 'node-0' } }],
      };
      return createUpdateWorkload(
        [
          createUpdateScene([...nodes, ...paths]),
          createUpdateScene([...nodes, ...paths.map((path, position) => (position === index ? changed : path))]),
        ],
        rootId => [
          [updateChild(rootId, nodes.length + index, changed)],
          [updateChild(rootId, nodes.length + index, paths[index])],
        ],
        1,
      );
    },
  },
  {
    kind: 'stroke',
    label: '单路径描边',
    create: count => createPathUpdate(count, path => ({ ...path, style: { ...path.style, strokeWidth: 3 } })),
  },
  {
    kind: 'steps',
    label: '单路径替换为 8 段折线',
    create: count =>
      createPathUpdate(count, path => ({
        ...path,
        children: [
          path.children[0],
          ...Array.from({ length: 8 }, (_, index) => ({
            type: 'step' as const,
            kind: 'line' as const,
            to: [20 * index, 15 * (index % 2)] as [number, number],
          })),
        ],
      })),
  },
  {
    kind: 'curve',
    label: '单路径 cubic 几何',
    create: count =>
      createPathUpdate(count, path => ({
        ...path,
        children: [
          path.children[0],
          { type: 'step', kind: 'cubic', control1: [20, 30], control2: [60, -30], to: [100, 0] },
        ],
      })),
  },
  {
    kind: 'arrow',
    label: '单路径箭头增删',
    create: count => createPathUpdate(count, path => ({ ...path, arrow: { end: { shape: 'stealth' } } })),
  },
  {
    kind: 'label',
    label: '单路径标签增删',
    create: count => createPathUpdate(count, path => ({ ...path, label: [{ text: 'label', position: 0.5 }] })),
  },
  {
    kind: 'mark',
    label: '单路径 mark 增删',
    create: count =>
      createPathUpdate(count, path => ({ ...path, marks: [{ shape: 'plus', pos: 0.5, length: 6, width: 6 }] })),
  },
];

defineUpdateBenchmarks('path', pathUpdateCases);
