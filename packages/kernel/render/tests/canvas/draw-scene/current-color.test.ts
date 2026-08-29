import type { IRScene, Scene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext, stealthSpec } from './helpers';

describe('drawScene currentColor 解析', () => {
  it('contextual number 在 Core 边界已成为不透明字符串，Canvas 不新增解析分支', () => {
    const ir: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'node', position: [0, 0], color: '#336699', fill: 0.2 }],
    };
    const scene = compileToScene(ir).scene;
    const context = createSpyCanvasContext();

    drawScene(context as unknown as CanvasRenderingContext2D, scene);

    expect(context.calls.find(call => call.name === 'fill')?.fillStyle).toBe('#d6e0eb');
  });

  it('stroke-currentColor：path 描边 currentColor 解析为 DrawOptions.currentColor', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 20 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: 'currentColor',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, { currentColor: '#abcdef' });

    expect(context.calls.find(c => c.name === 'stroke')?.strokeStyle).toBe('#abcdef');
  });

  it('fill-currentColor：rect 填充 currentColor 解析为 DrawOptions.currentColor', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 20 },
      primitives: [{ type: 'rect', x: 0, y: 0, width: 40, height: 20, fill: 'currentColor' }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, { currentColor: '#123456' });

    expect(context.calls.find(c => c.name === 'fill')?.fillStyle).toBe('#123456');
  });

  it('text-currentColor：文本 fill currentColor 解析为 DrawOptions.currentColor', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 20 },
      primitives: [
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'A' }],
          fontSize: 12,
          align: 'start',
          baseline: 'top',
          lineHeight: 14,
          measuredWidth: 12,
          measuredHeight: 14,
          fill: 'currentColor',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, { currentColor: '#0a0a0a' });

    expect(context.calls.find(c => c.name === 'fillText')?.fillStyle).toBe('#0a0a0a');
  });

  it('arrow-currentColor：箭头 contextStroke 跟随解析后的 path 描边色', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 20 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: 'currentColor',
          strokeWidth: 1,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, { currentColor: '#ff8800' });

    const markerFill = [...context.calls].reverse().find(c => c.name === 'fill');
    expect(markerFill?.fillStyle).toBe('#ff8800');
  });

  it('no-currentColor-option：未提供 currentColor 时保持原串、不报错', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 20 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: 'currentColor',
        },
      ],
    };

    expect(() => drawScene(context as unknown as CanvasRenderingContext2D, s)).not.toThrow();
    expect(context.calls.find(c => c.name === 'stroke')?.strokeStyle).toBe('currentColor');
  });
});
