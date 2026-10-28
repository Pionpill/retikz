import { compileToScene } from '@retikz/core';
import type { Scene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { drawScene } from '../../src/canvas';
import { renderToSvgString } from '../../src/svg';
import { createSpyCanvasContext } from '../canvas/draw-scene/helpers';

const scene: Scene = {
  layout: { x: 0, y: 0, width: 20, height: 20 },
  primitives: [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      fill: 'crimson',
      fillOpacity: 0.6,
      stroke: 'royalblue',
      strokeWidth: 2,
      strokeOpacity: 0.4,
      opacity: 0.5,
      fillRule: 'evenodd',
    },
  ],
};

describe('TeX 下沉了 PathPrimitive 渲染器等价性', () => {
  it('SVG 保留多通道 paint 与 opacity', () => {
    const svg = renderToSvgString(scene, { idPrefix: 'tex' });

    expect(svg).toContain('fill="crimson"');
    expect(svg).toContain('fill-opacity="0.6"');
    expect(svg).toContain('stroke="royalblue"');
    expect(svg).toContain('stroke-opacity="0.4"');
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it('Canvas 对同一 PathPrimitive 应用 fill / stroke paint 与透明度', () => {
    const context = createSpyCanvasContext();
    drawScene(context as unknown as CanvasRenderingContext2D, scene);

    expect(context.calls.find(call => call.name === 'fill')).toMatchObject({ fillStyle: 'crimson', globalAlpha: 0.3 });
    expect(context.calls.find(call => call.name === 'stroke')).toMatchObject({
      strokeStyle: 'royalblue',
      lineWidth: 2,
      globalAlpha: 0.2,
    });
  });
});

it('编译后的分组不透明度同时达到 SVG 属性和 Canvas alpha', () => {
  const compiled = compileToScene({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'path',
        style: { fill: 'crimson', stroke: 'royalblue', opacity: { overall: 0.5, fill: 0.5, stroke: 0.8 } },
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [20, 0] },
          { type: 'step', kind: 'line', to: [10, 20] },
          { type: 'step', kind: 'cycle' },
        ],
      },
    ],
  }).scene;
  const svg = renderToSvgString(compiled, { idPrefix: 'opacity' });
  expect(svg).toContain('opacity="0.5"');
  expect(svg).toContain('fill-opacity="0.5"');
  expect(svg).toContain('stroke-opacity="0.8"');
  const context = createSpyCanvasContext();
  drawScene(context as unknown as CanvasRenderingContext2D, compiled);
  expect(context.calls.find(call => call.name === 'fill')?.globalAlpha).toBe(0.25);
  expect(context.calls.find(call => call.name === 'stroke')?.globalAlpha).toBe(0.4);
});
