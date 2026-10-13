import type { IRScene } from '@retikz/core';

/** 连线声明先于节点，用于追踪延迟路径回填 */
export const compilationExample: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'A' } },
        { type: 'step', kind: 'line', to: { id: 'B' } },
      ],
    },
    {
      type: 'node',
      id: 'A',
      position: [0, 0],
      text: 'A',
      layout: { minimumSize: { width: 60, height: 40 }, padding: 0, margin: 0 },
    },
    {
      type: 'node',
      id: 'B',
      position: [180, 0],
      text: 'B',
      layout: { minimumSize: { width: 60, height: 40 }, padding: 0, margin: 0 },
    },
  ],
};
