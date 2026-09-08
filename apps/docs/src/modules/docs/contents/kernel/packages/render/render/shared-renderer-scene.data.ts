import type { IRScene } from '@retikz/core';

/** SVG 与 Canvas 页面共用的 renderer-agnostic IR。 */
export const sharedRendererScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'scene',
      position: [-72, 0],
      shape: 'circle',
      text: 'Scene',
      style: { fill: 'darkorange', stroke: 'none' },
      layout: { minimumSize: 54 },
    },
    {
      type: 'node',
      id: 'output',
      position: [72, 0],
      text: 'Output',
      style: { stroke: 'currentColor' },
      layout: { minimumSize: { width: 84, height: 48 } },
    },
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'scene' } },
        { type: 'step', kind: 'line', to: { id: 'output' } },
      ],
      style: { stroke: 'currentColor', strokeWidth: 2 },
    },
  ],
} satisfies IRScene;
