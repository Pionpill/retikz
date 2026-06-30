import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

describe('drawScene 渐变描边', () => {
  it('path stroke resourceRef：Canvas stroke 使用同源 linearGradient', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'g',
          spec: {
            kind: 'linearGradient',
            angle: 90,
            stops: [
              { offset: 0, color: '#000' },
              { offset: 1, color: '#fff' },
            ],
          },
        },
      ],
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [100, 50] },
          ],
          stroke: { kind: 'resourceRef', id: 'g' },
          strokeWidth: 3,
          dashPattern: [4, 2],
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(
      (context.calls.find(c => c.name === 'createLinearGradient')?.args as Array<number>).map(n => Math.round(n)),
    ).toEqual([50, 0, 50, 50]);
    expect(context.calls.filter(c => c.name === 'addColorStop').map(c => c.args)).toEqual([
      [0, '#000'],
      [1, '#fff'],
    ]);
    const stroke = context.calls.find(c => c.name === 'stroke');
    expect(stroke?.lineWidth).toBe(3);
    expect(context.calls.find(c => c.name === 'setLineDash')?.args).toEqual([[4, 2]]);
  });
});
