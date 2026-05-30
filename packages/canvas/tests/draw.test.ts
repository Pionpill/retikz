import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { drawScene } from '../src';

type CanvasCall = {
  name: string;
  args: Array<unknown>;
  font?: string;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineWidth?: number;
};

type SpyCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'arc'
  | 'beginPath'
  | 'bezierCurveTo'
  | 'clearRect'
  | 'closePath'
  | 'ellipse'
  | 'fill'
  | 'fillText'
  | 'lineTo'
  | 'moveTo'
  | 'quadraticCurveTo'
  | 'rect'
  | 'restore'
  | 'save'
  | 'setLineDash'
  | 'setTransform'
  | 'rotate'
  | 'scale'
  | 'stroke'
  | 'translate'
> & {
  calls: Array<CanvasCall>;
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
};

const createSpyCanvasContext = (): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  const stack: Array<Pick<SpyCanvasContext, 'font' | 'lineCap' | 'lineJoin' | 'lineWidth'>> = [];
  const context = {
    calls,
    fillStyle: '#000',
    font: '',
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as SpyCanvasContext;
  const record = (name: string) => (...args: Array<unknown>) => {
    if (name === 'save') {
      stack.push({ font: context.font, lineCap: context.lineCap, lineJoin: context.lineJoin, lineWidth: context.lineWidth });
    }
    if (name === 'restore') {
      const snapshot = stack.pop();
      if (snapshot) Object.assign(context, snapshot);
    }
    calls.push({
      name,
      args,
      font: context.font,
      lineCap: context.lineCap,
      lineJoin: context.lineJoin,
      lineWidth: context.lineWidth,
    });
  };

  Object.assign(context, {
    arc: record('arc'),
    beginPath: record('beginPath'),
    bezierCurveTo: record('bezierCurveTo'),
    clearRect: record('clearRect'),
    closePath: record('closePath'),
    ellipse: record('ellipse'),
    fill: record('fill'),
    fillText: record('fillText'),
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    rect: record('rect'),
    restore: record('restore'),
    rotate: record('rotate'),
    save: record('save'),
    scale: record('scale'),
    setLineDash: record('setLineDash'),
    setTransform: record('setTransform'),
    stroke: record('stroke'),
    translate: record('translate'),
  });

  return context;
};

const scene: Scene = {
  layout: { x: 0, y: 0, width: 120, height: 80 },
  primitives: [
    { type: 'rect', x: 1, y: 2, width: 30, height: 20, fill: '#f00', stroke: '#111', strokeWidth: 2 },
    { type: 'ellipse', cx: 50, cy: 20, rx: 10, ry: 5, fill: '#0f0' },
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 10] },
        { kind: 'quad', control: [12, 14], to: [20, 10] },
        { kind: 'cubic', control1: [22, 8], control2: [24, 12], to: [30, 10] },
        { kind: 'close' },
      ],
      stroke: '#222',
      fill: '#ddd',
      fillRule: 'evenodd',
      strokeLinecap: 'round',
      strokeLinejoin: 'bevel',
      dashPattern: [4, 2],
    },
    {
      type: 'text',
      x: 4,
      y: 6,
      lines: [{ text: 'Hello' }],
      fontSize: 12,
      align: 'start',
      baseline: 'top',
      lineHeight: 14,
      measuredWidth: 30,
      measuredHeight: 14,
      fill: '#333',
    },
    {
      type: 'group',
      transforms: [{ kind: 'translate', x: 8, y: 9 }],
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, stroke: '#444' }],
    },
  ],
};

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
