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
