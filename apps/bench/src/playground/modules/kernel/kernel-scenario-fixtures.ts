import type { IRChild, IRNode, IRPath, IRScene } from '@retikz/core';

import type { KernelLabScenarioIdValue } from './kernel-scenarios';

import { createSimpleNodeScene } from '../../../shared';
import { KernelLabScenarioId } from './kernel-scenarios';

/** 可供 benchmark 交替更新的两个确定性 Scene */
export type KernelLabScenePair = Readonly<{
  first: IRScene;
  second: IRScene;
}>;

const selectedNodeIndex = 2_500;

/** 排除具有开放 type 字段的 Tier 2 composite，识别 Kernel Node */
const isKernelNode = (child: IRChild): child is IRNode => child.type === 'node' && !('namespace' in child);

/** 替换一个稳定节点并保留其余 child 引用 */
const updateNode = (scene: IRScene, index: number, update: (node: IRNode) => IRNode): IRScene => {
  const child = scene.children[index];
  if (!isKernelNode(child)) throw new Error('Kernel Lab fixture target must be a node');
  return {
    ...scene,
    children: scene.children.map((candidate, childIndex) => (childIndex === index ? update(child) : candidate)),
  };
};

/** 创建全部节点样式变化的密集网格 */
const createDenseNodeGridPair = (): KernelLabScenePair => {
  const first = createSimpleNodeScene(5_000);
  const second: IRScene = {
    ...first,
    children: first.children.map(child => {
      if (!isKernelNode(child)) throw new Error('Dense node grid fixture must contain only nodes');
      return { ...child, fill: child.fill === '#2563eb' ? '#0891b2' : '#db2777' };
    }),
  };
  return { first, second };
};

/** 创建普通节点、文本节点与路径数量均衡的混合图元 Scene */
const createMixedPrimitiveScene = (): IRScene => ({
  version: 1,
  type: 'scene',
  children: Array.from({ length: 3_000 }, (_, index): IRChild => {
    const column = index % 75;
    const row = Math.floor(index / 75);
    const x = column * 16;
    const y = row * 16;
    if (index % 3 === 0) {
      return {
        type: 'node',
        id: `mixed-node-${index.toString().padStart(4, '0')}`,
        position: [x, y],
        width: 10,
        height: 10,
        fill: '#2563eb',
      };
    }
    if (index % 3 === 1) {
      return {
        type: 'node',
        id: `mixed-text-${index.toString().padStart(4, '0')}`,
        position: [x, y],
        width: 14,
        height: 12,
        fill: '#7c3aed',
        text: `${index % 10}`,
      };
    }
    return {
      type: 'path',
      id: `mixed-path-${index.toString().padStart(4, '0')}`,
      stroke: '#0f766e',
      strokeWidth: 2,
      children: [
        { type: 'step', kind: 'move', to: [x - 6, y] },
        { type: 'step', kind: 'line', to: [x + 6, y + 6] },
      ],
    };
  }),
});

/** 创建全部混合图元样式变化的 Scene pair */
const createMixedPrimitivesPair = (): KernelLabScenePair => {
  const first = createMixedPrimitiveScene();
  const second: IRScene = {
    ...first,
    children: first.children.map(child =>
      child.type === 'path'
        ? { ...child, stroke: '#ea580c' }
        : isKernelNode(child)
          ? { ...child, fill: child.text === undefined ? '#16a34a' : '#c026d3' }
          : child,
    ),
  };
  return { first, second };
};

/** 创建包含多段直线与三次贝塞尔曲线的复杂路径 */
const createComplexPath = (index: number): IRPath => {
  const x = (index % 25) * 48;
  const y = Math.floor(index / 25) * 24;
  return {
    type: 'path',
    id: `complex-path-${index.toString().padStart(4, '0')}`,
    stroke: index % 2 === 0 ? '#2563eb' : '#7c3aed',
    strokeWidth: 1.5,
    children: [
      { type: 'step', kind: 'move', to: [x, y] },
      { type: 'step', kind: 'cubic', to: [x + 12, y + 6], control1: [x + 3, y - 8], control2: [x + 9, y + 14] },
      { type: 'step', kind: 'line', to: [x + 18, y - 2] },
      { type: 'step', kind: 'cubic', to: [x + 28, y + 4], control1: [x + 20, y - 10], control2: [x + 26, y + 16] },
      { type: 'step', kind: 'line', to: [x + 34, y + 10] },
      { type: 'step', kind: 'cubic', to: [x + 42, y], control1: [x + 36, y + 18], control2: [x + 40, y - 10] },
      { type: 'step', kind: 'line', to: [x + 46, y + 6] },
    ],
  };
};

/** 创建全部复杂路径样式变化的 Scene pair */
const createComplexPathsPair = (): KernelLabScenePair => {
  const first: IRScene = {
    version: 1,
    type: 'scene',
    children: Array.from({ length: 1_000 }, (_, index) => createComplexPath(index)),
  };
  const second: IRScene = {
    ...first,
    children: first.children.map(child => {
      if (child.type !== 'path' || 'namespace' in child) {
        throw new Error('Complex paths fixture must contain only paths');
      }
      return { ...child, stroke: child.stroke === '#2563eb' ? '#0891b2' : '#db2777' };
    }),
  };
  return { first, second };
};

/** 创建单节点拖动 Scene pair */
const createNodeDragPair = (): KernelLabScenePair => {
  const first = createSimpleNodeScene(5_000);
  const second = updateNode(first, selectedNodeIndex, node => ({
    ...node,
    position: [12, 312],
  }));
  return { first, second };
};

/** 创建单节点选中状态变化 Scene pair */
const createNodeSelectionPair = (): KernelLabScenePair => {
  const first = createSimpleNodeScene(5_000);
  const second = updateNode(first, selectedNodeIndex, node => ({
    ...node,
    fill: '#f59e0b',
    stroke: '#fef3c7',
    strokeWidth: 3,
  }));
  return { first, second };
};

/** 创建删除一个节点并插入一个节点的 Scene pair */
const createNodeInsertRemovePair = (): KernelLabScenePair => {
  const first = createSimpleNodeScene(5_000);
  const removed = first.children[0];
  if (!isKernelNode(removed)) throw new Error('Node insertion fixture must contain only nodes');
  const inserted: IRNode = {
    ...removed,
    id: 'entity-inserted',
    position: [0, 0],
    fill: '#f59e0b',
  };
  const second: IRScene = { ...first, children: [...first.children.slice(1), inserted] };
  return { first, second };
};

/** 按稳定场景 ID 创建可交替执行的确定性 Scene pair */
export const createKernelLabScenePair = (scenarioId: KernelLabScenarioIdValue): KernelLabScenePair => {
  switch (scenarioId) {
    case KernelLabScenarioId.DenseNodeGrid:
      return createDenseNodeGridPair();
    case KernelLabScenarioId.MixedPrimitives:
      return createMixedPrimitivesPair();
    case KernelLabScenarioId.ComplexPaths:
      return createComplexPathsPair();
    case KernelLabScenarioId.NodeDrag:
      return createNodeDragPair();
    case KernelLabScenarioId.NodeSelection:
      return createNodeSelectionPair();
    case KernelLabScenarioId.NodeInsertRemove:
      return createNodeInsertRemovePair();
  }
};
