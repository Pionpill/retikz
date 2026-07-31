import type { IRScene } from '@retikz/core';

/** 创建具有稳定 identity 的简单节点 benchmark Scene */
export const createSimpleNodeScene = (count: number): IRScene => {
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error('createSimpleNodeScene: count must be a positive safe integer');
  }
  return {
    version: 1,
    type: 'scene',
    children: Array.from({ length: count }, (_, index) => ({
      type: 'node' as const,
      id: `entity-${index.toString().padStart(5, '0')}`,
      position: [(index % 100) * 12, Math.floor(index / 100) * 12] as [number, number],
      width: 8,
      height: 8,
      fill: index % 2 === 0 ? '#2563eb' : '#7c3aed',
    })),
  };
};

/** 只替换一个稳定 entity 的 fill，并保留其余 fixture 引用与顺序 */
export const updateSimpleNodeFill = (scene: IRScene, index: number, fill: string): IRScene => {
  if (!Number.isSafeInteger(index) || index < 0 || index >= scene.children.length) {
    throw new Error('updateSimpleNodeFill: index must address an existing child');
  }
  const child = scene.children[index];
  if (child.type !== 'node') throw new Error('updateSimpleNodeFill: target child must be a node');
  return {
    ...scene,
    children: scene.children.map((candidate, childIndex) => (childIndex === index ? { ...child, fill } : candidate)),
  };
};

/** 创建总 primitive occurrence 数固定且首个 Node 稳定编译为 Group 的 benchmark Scene */
export const createStableGroupScene = (primitiveCount: number): IRScene => {
  if (!Number.isSafeInteger(primitiveCount) || primitiveCount < 4) {
    throw new Error('createStableGroupScene: primitiveCount must be a safe integer greater than three');
  }
  const children = createSimpleNodeScene(primitiveCount - 3).children;
  return {
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'node',
        id: 'stable-group',
        position: [0, 0],
        width: 8,
        height: 8,
        fill: '#2563eb',
        text: 'G',
      },
      ...children,
    ],
  };
};

/** 只替换会编译为 stable Group 的 Node fill，保持其余 entity 引用与顺序 */
export const updateStableGroupFill = (scene: IRScene, fill: string): IRScene => {
  const group = scene.children[0];
  if (group.type !== 'node' || group.id !== 'stable-group' || group.text === undefined) {
    throw new Error('updateStableGroupFill: scene must contain the stable-group fixture root');
  }
  return { ...scene, children: [{ ...group, fill }, ...scene.children.slice(1)] };
};
