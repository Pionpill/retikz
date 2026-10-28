import type { Scene } from '@retikz/core';
import { compileToScene, SceneSchema } from '@retikz/core';
import { expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { renderToSvgString } from '../../../src/svg';
import { createSpyCanvasContext } from './helpers';

it('箭头绘制资源渲染为范围 SVG 引用和 Canvas 渐变', () => {
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'path',
        arrow: {
          end: {
            shape: 'stealth',
            fill: {
              kind: 'linearGradient',
              stops: [
                { offset: 0, color: 'red' },
                { offset: 1, color: 'blue' },
              ],
            },
            stroke: 'black',
            lineCap: 'round',
            lineJoin: 'bevel',
            dashPattern: [2, 1],
          },
        },
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [100, 0] },
        ],
      },
    ],
  });
  const scene = compileToScene(source).scene;
  const resource = scene.resources?.[0];
  expect(resource).toBeDefined();
  const svg = renderToSvgString(scene, { idPrefix: 'style-test' });
  expect(svg).toContain(`fill="url(#retikz-paint-style-test-${resource?.id})"`);
  expect(svg).toContain('stroke-linecap="round"');
  expect(svg).toContain('stroke-linejoin="bevel"');
  const context = createSpyCanvasContext();
  drawScene(context as unknown as CanvasRenderingContext2D, scene);
  expect(context.calls.some(call => call.name === 'createLinearGradient')).toBe(true);
  expect(context.calls.filter(call => call.name === 'stroke').at(-1)).toMatchObject({
    lineCap: 'round',
    lineJoin: 'bevel',
  });
});

it('矩形和椭圆保留破折号大写并跨渲染器连接', () => {
  const scene: Scene = {
    layout: { x: 0, y: 0, width: 100, height: 100 },
    primitives: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        stroke: 'red',
        strokeWidth: 2,
        dashPattern: [2, 1],
        lineCap: 'round',
        lineJoin: 'bevel',
      },
      {
        type: 'ellipse',
        cx: 50,
        cy: 50,
        rx: 10,
        ry: 20,
        stroke: 'blue',
        strokeWidth: 2,
        dashPattern: [2, 1],
        lineCap: 'square',
        lineJoin: 'round',
      },
    ],
  };
  const svg = renderToSvgString(scene, { idPrefix: 'shapes' });
  expect(svg).toContain('stroke-linecap="round"');
  expect(svg).toContain('stroke-linecap="square"');
  expect(svg).toContain('stroke-linejoin="bevel"');
  const context = createSpyCanvasContext();
  drawScene(context as unknown as CanvasRenderingContext2D, scene);
  expect(context.calls.filter(call => call.name === 'stroke')).toMatchObject([
    { lineCap: 'round', lineJoin: 'bevel' },
    { lineCap: 'square', lineJoin: 'round' },
  ]);
});
