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
      minimumSize: 54,
      fill: 'darkorange',
      stroke: 'none',
      text: 'Scene',
    },
    {
      type: 'node',
      id: 'output',
      position: [72, 0],
      minimumSize: { width: 84, height: 48 },
      stroke: 'currentColor',
      text: 'Output',
    },
    {
      type: 'path',
      stroke: 'currentColor',
      strokeWidth: 2,
      children: [
        { type: 'step', kind: 'move', to: { id: 'scene' } },
        { type: 'step', kind: 'line', to: { id: 'output' } },
      ],
    },
  ],
} satisfies IRScene;
