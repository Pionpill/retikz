import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { drawScene } from '../src';

type CanvasCall = {
  name: string;
  args: Array<unknown>;
  font?: string;
  fillStyle?: string | CanvasGradient | CanvasPattern;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineWidth?: number;
  strokeStyle?: string | CanvasGradient | CanvasPattern;
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
      fillStyle: context.fillStyle,
      lineCap: context.lineCap,
      lineJoin: context.lineJoin,
      lineWidth: context.lineWidth,
      strokeStyle: context.strokeStyle,
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

/** stealth 实心箭头（`arrow="->"` 默认形状）的已解析 marker 描述：refX=3 / baseSize=10 / 6×6 / 实心三角 contextStroke */
const stealthSpec = {
  shape: 'stealth' as const,
  baseSize: 10,
  refX: 3,
  markerWidth: 6,
  markerHeight: 6,
  marker: [
    {
      type: 'path' as const,
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [10, 5] as [number, number] },
        { kind: 'line' as const, to: [0, 10] as [number, number] },
        { kind: 'line' as const, to: [3, 5] as [number, number] },
        { kind: 'close' as const },
      ],
      fill: { kind: 'contextStroke' as const },
    },
  ],
};

describe('drawScene 箭头 marker', () => {
  it('arrow-end-renders：末端 marker 贴终点、沿切线定向、按 markerUnits=strokeWidth 缩放、contextStroke 解析为线色', () => {
    const context = createSpyCanvasContext();
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 2,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    // 定位到终点 [40,0]，并将 marker 参考点 (refX=3, refY=baseSize/2=5) 平移回原点
    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === 40 && c.args[1] === 0)).toBe(true);
    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === -3 && c.args[1] === -5)).toBe(true);
    // 切线方向为 +x → 旋转角 0
    expect(context.calls.some(c => c.name === 'rotate' && c.args[0] === 0)).toBe(true);
    // 缩放 = markerWidth/baseSize × strokeWidth = 6/10 × 2 = 1.2（两轴各自）
    const scaleCall = context.calls.find(c => c.name === 'scale');
    expect(scaleCall?.args).toEqual([1.2, 1.2]);
    // 实心三角被填充，contextStroke 解析为 path 的 stroke 色
    const markerFill = [...context.calls].reverse().find(c => c.name === 'fill');
    expect(markerFill?.fillStyle).toBe('#222');
    // marker 几何按局部 baseSize 坐标绘制
    const moveTos = context.calls.filter(c => c.name === 'moveTo').map(c => c.args);
    expect(moveTos).toContainEqual([0, 0]);
    expect(context.calls.some(c => c.name === 'lineTo' && c.args[0] === 10 && c.args[1] === 5)).toBe(true);
  });

  it('arrow-start-reverse：起点 marker 朝向反向（auto-start-reverse）', () => {
    const context = createSpyCanvasContext();
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 1,
          arrowStart: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    // 起点 [0,0]；离开方向 +x，反向后角度为 π
    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === 0 && c.args[1] === 0)).toBe(true);
    const rotateCall = context.calls.find(c => c.name === 'rotate');
    expect(rotateCall?.args[0]).toBeCloseTo(Math.PI);
    // strokeWidth=1 → 缩放 0.6
    expect(context.calls.find(c => c.name === 'scale')?.args).toEqual([0.6, 0.6]);
  });

  it('arrow-orient-diagonal：切线为对角线时旋转角等于 atan2', () => {
    const context = createSpyCanvasContext();
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 80 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [30, 30] },
          ],
          stroke: '#000',
          strokeWidth: 1,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    expect(context.calls.find(c => c.name === 'rotate')?.args[0]).toBeCloseTo(Math.atan2(30, 30));
  });

  it('arrow-marker-isolated-strokestyle：空心 marker 描边不继承 path 的 lineCap / lineJoin（如 SVG defs marker）', () => {
    const context = createSpyCanvasContext();
    const hollowSpec = {
      shape: 'open' as const,
      baseSize: 10,
      refX: 1,
      markerWidth: 6,
      markerHeight: 6,
      marker: [
        {
          type: 'path' as const,
          commands: [
            { kind: 'move' as const, to: [1, 1] as [number, number] },
            { kind: 'line' as const, to: [9, 5] as [number, number] },
            { kind: 'line' as const, to: [1, 9] as [number, number] },
            { kind: 'close' as const },
          ],
          stroke: 'context-stroke',
          strokeWidth: 1,
        },
      ],
    };
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          arrowEnd: hollowSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    // path 自身用 round；marker 描边应回到 canvas 默认 butt / miter（与 SVG defs marker 一致）
    const strokeCalls = context.calls.filter(c => c.name === 'stroke');
    const markerStroke = strokeCalls[strokeCalls.length - 1];
    expect(markerStroke.lineCap).toBe('butt');
    expect(markerStroke.lineJoin).toBe('miter');
  });

  it('arrow-no-marker-warning：渲染箭头不再发 marker 降级告警', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 1,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene, {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(warnings).not.toContain('marker');
  });
});
