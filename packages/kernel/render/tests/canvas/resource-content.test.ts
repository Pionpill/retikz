import { createCanvas } from '@napi-rs/canvas';
import type { Scene, ScenePrimitive } from '@retikz/core';
import { expect, it } from 'vitest';

import { drawScene } from '../../src/canvas';

it('箭头和 Pattern 内容共用场景的裁剪与绘制资源', () => {
  const content: ScenePrimitive = {
    type: 'group',
    clipRef: 'window',
    children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: { kind: 'resourceRef', id: 'green' } }],
  };
  const scene: Scene = {
    layout: { x: 0, y: 0, width: 64, height: 64 },
    primitives: [
      {
        type: 'path',
        stroke: 'black',
        strokeWidth: 1,
        fill: 'none',
        commands: [
          { kind: 'move', to: [0, 20] },
          { kind: 'line', to: [30, 20] },
        ],
        arrowEnd: { shape: 'test', baseSize: 10, refX: 10, markerWidth: 10, markerHeight: 10, marker: [content] },
      },
      { type: 'rect', x: 0, y: 30, width: 20, height: 20, fill: { kind: 'resourceRef', id: 'tile' } },
    ],
    resources: [
      {
        kind: 'paint',
        id: 'green',
        spec: {
          kind: 'linearGradient',
          stops: [
            { offset: 0, color: '#00ff00' },
            { offset: 1, color: '#00ff00' },
          ],
        },
      },
      { kind: 'paint', id: 'tile', spec: { kind: 'pattern', shape: 'test' }, tile: { size: 10, motif: [content] } },
      {
        kind: 'clip',
        id: 'window',
        path: {
          fillRule: 'nonzero',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [5, 0] },
            { kind: 'line', to: [5, 10] },
            { kind: 'line', to: [0, 10] },
            { kind: 'close' },
          ],
        },
      },
    ],
  };
  const canvas = createCanvas(64, 64);
  const context = canvas.getContext('2d');
  drawScene(context as unknown as CanvasRenderingContext2D, scene, {
    createOffscreen: (width, height) =>
      createCanvas(width, height).getContext('2d') as unknown as CanvasRenderingContext2D,
  });
  const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data);
  expect(pixel(22, 17)).toEqual([0, 255, 0, 255]);
  expect(pixel(28, 17)).toEqual([0, 0, 0, 0]);
  expect(pixel(2, 32)).toEqual([0, 255, 0, 255]);
  expect(pixel(8, 32)).toEqual([0, 0, 0, 0]);
});
