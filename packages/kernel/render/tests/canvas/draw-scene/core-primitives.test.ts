import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext, scene } from './helpers';

describe('drawScene 规格', () => {
  it('draw-core-prims：按 Scene 顺序绘制 rect / ellipse / path / text / group 核心图元', () => {
    const context = createSpyCanvasContext();

    drawScene(context as unknown as CanvasRenderingContext2D, scene);

    expect(context.calls.map(call => call.name).filter(name => name !== 'save' && name !== 'restore')).toEqual([
      'beginPath',
      'rect',
      'fill',
      'setLineDash',
      'stroke',
      'beginPath',
      'ellipse',
      'fill',
      'beginPath',
      'moveTo',
      'lineTo',
      'quadraticCurveTo',
      'bezierCurveTo',
      'closePath',
      'fill',
      'setLineDash',
      'stroke',
      'fillText',
      'translate',
      'beginPath',
      'rect',
      'setLineDash',
      'stroke',
    ]);
    expect(context.calls.find(call => call.name === 'rect')?.args).toEqual([1, 2, 30, 20]);
    expect(context.calls.find(call => call.name === 'ellipse')?.args.slice(0, 4)).toEqual([50, 20, 10, 5]);
    expect(context.calls.find(call => call.name === 'fillText')?.args).toEqual(['Hello', 4, 6]);
    expect(context.lineWidth).toBe(1);
    expect(context.lineCap).toBe('butt');
    expect(context.lineJoin).toBe('miter');
  });

  it('stroke-style-state-leak：独立图元不会继承前一个图元的 strokeWidth', () => {
    const context = createSpyCanvasContext();
    const isolatedScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 20, height: 20, stroke: '#111', strokeWidth: 20 },
        { type: 'rect', x: 30, y: 0, width: 20, height: 20, stroke: '#222' },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, isolatedScene);

    const strokeCalls = context.calls.filter(call => call.name === 'stroke');
    expect(strokeCalls.map(call => call.lineWidth)).toEqual([20, 1]);
  });

  it('path-linecap-linejoin-state-leak：独立 path 不继承前一个 path 的 lineCap / lineJoin', () => {
    const context = createSpyCanvasContext();
    const isolatedScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [20, 0] },
          ],
          stroke: '#111',
          strokeLinecap: 'round',
          strokeLinejoin: 'bevel',
        },
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 10] },
            { kind: 'line', to: [20, 10] },
          ],
          stroke: '#222',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, isolatedScene);

    const strokeCalls = context.calls.filter(call => call.name === 'stroke');
    expect(strokeCalls.map(call => call.lineCap)).toEqual(['round', 'butt']);
    expect(strokeCalls.map(call => call.lineJoin)).toEqual(['bevel', 'miter']);
  });

  it('dash-offset-state-leak：独立图元不继承前一个图元的 lineDashOffset', () => {
    const context = createSpyCanvasContext();
    const isolatedScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [20, 0] },
          ],
          stroke: '#111',
          dashPattern: [4, 2],
          dashOffset: 6,
        },
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 10] },
            { kind: 'line', to: [20, 10] },
          ],
          stroke: '#222',
          dashPattern: [4, 2],
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, isolatedScene);

    const strokeCalls = context.calls.filter(call => call.name === 'stroke');
    expect(strokeCalls.map(call => call.lineDashOffset)).toEqual([6, 0]);
  });

  it('text-default-font-family: uses DrawOptions.defaultFontFamily when text has no fontFamily', () => {
    const context = createSpyCanvasContext();
    const textScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'Base' }],
          fontSize: 12,
          align: 'start',
          baseline: 'top',
          lineHeight: 14,
          measuredWidth: 24,
          measuredHeight: 14,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, textScene, {
      defaultFontFamily: 'Inter, sans-serif',
    });

    expect(context.calls.find(call => call.name === 'fillText')?.font).toBe('12px Inter, sans-serif');
  });

  it('text-explicit-font-family: text fontFamily wins over DrawOptions.defaultFontFamily', () => {
    const context = createSpyCanvasContext();
    const textScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'Mono' }],
          fontSize: 12,
          fontFamily: 'monospace',
          align: 'start',
          baseline: 'top',
          lineHeight: 14,
          measuredWidth: 24,
          measuredHeight: 14,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, textScene, {
      defaultFontFamily: 'Inter, sans-serif',
    });

    expect(context.calls.find(call => call.name === 'fillText')?.font).toBe('12px monospace');
  });
});
