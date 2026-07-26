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

describe('TeX lowered PathPrim renderer parity', () => {
  it('SVG 保留多通道 paint 与 opacity', () => {
    const svg = renderToSvgString(scene, { idPrefix: 'tex' });
    expect(svg).toContain('fill="crimson"');
    expect(svg).toContain('fill-opacity="0.6"');
    expect(svg).toContain('stroke="royalblue"');
    expect(svg).toContain('stroke-opacity="0.4"');
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it('Canvas 对同一 PathPrim 应用 fill / stroke paint 与透明度', () => {
    const context = createSpyCanvasContext();
    drawScene(context as unknown as CanvasRenderingContext2D, scene);
    expect(context.calls.find(call => call.name === 'fill')).toMatchObject({ fillStyle: 'crimson' });
    expect(context.calls.find(call => call.name === 'stroke')).toMatchObject({
      strokeStyle: 'royalblue',
      lineWidth: 2,
    });
  });
});
