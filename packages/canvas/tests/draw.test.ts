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
  | 'clip'
  | 'closePath'
  | 'createLinearGradient'
  | 'createPattern'
  | 'createRadialGradient'
  | 'drawImage'
  | 'ellipse'
  | 'fill'
  | 'fillRect'
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

  const makeGradient = (): CanvasGradient => ({
    addColorStop: (...a: Array<unknown>) => {
      calls.push({ name: 'addColorStop', args: a });
    },
  });

  Object.assign(context, {
    arc: record('arc'),
    beginPath: record('beginPath'),
    bezierCurveTo: record('bezierCurveTo'),
    clearRect: record('clearRect'),
    clip: record('clip'),
    closePath: record('closePath'),
    createLinearGradient: (...args: Array<unknown>) => {
      record('createLinearGradient')(...args);
      return makeGradient();
    },
    createRadialGradient: (...args: Array<unknown>) => {
      record('createRadialGradient')(...args);
      return makeGradient();
    },
    createPattern: (...args: Array<unknown>) => {
      record('createPattern')(...args);
      return {
        setTransform: (...t: Array<unknown>) => {
          calls.push({ name: 'patternSetTransform', args: t });
        },
      };
    },
    drawImage: record('drawImage'),
    ellipse: record('ellipse'),
    fill: record('fill'),
    fillRect: record('fillRect'),
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

describe('drawScene currentColor 解析', () => {
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

describe('drawScene 渐变填充', () => {
  it('linear-gradient：rect 线性渐变按 bbox + angle 映射 createLinearGradient + addColorStop', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'paint-1',
          spec: {
            type: 'linearGradient',
            stops: [
              { offset: 0, color: '#f00' },
              { offset: 1, color: '#00f' },
            ],
          },
        },
      ],
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'paint-1' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      warnUnsupported: w => warnings.push(w.feature),
    });

    // angle 缺省 0（左→右）：bbox(0,0,100,50) → 渐变线 (0,25)→(100,25)
    expect(context.calls.find(c => c.name === 'createLinearGradient')?.args).toEqual([0, 25, 100, 25]);
    expect(context.calls.filter(c => c.name === 'addColorStop').map(c => c.args)).toEqual([
      [0, '#f00'],
      [1, '#00f'],
    ]);
    expect(context.calls.some(c => c.name === 'fill')).toBe(true);
    expect(warnings).not.toContain('paint');
  });

  it('linear-gradient-angle：angle=90 沿 +y 方向映射渐变线', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'g',
          spec: {
            type: 'linearGradient',
            angle: 90,
            stops: [
              { offset: 0, color: '#000' },
              { offset: 1, color: '#fff' },
            ],
          },
        },
      ],
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'g' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    // angle 90（+y 屏幕下）：渐变线 (50,0)→(50,50)
    const call = context.calls.find(c => c.name === 'createLinearGradient');
    expect((call?.args as Array<number>).map(n => Math.round(n))).toEqual([50, 0, 50, 50]);
  });

  it('radial-gradient：rect 径向渐变映射 createRadialGradient（中心 bbox 相对、半径 cover）', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'r',
          spec: {
            type: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 80, height: 80, fill: { kind: 'resourceRef', id: 'r' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    // center 默认 (0.5,0.5) → (40,40)，radius 默认 0.5 → 0.5*max(80,80)=40
    expect(context.calls.find(c => c.name === 'createRadialGradient')?.args).toEqual([40, 40, 0, 40, 40, 40]);
    expect(context.calls.filter(c => c.name === 'addColorStop').length).toBe(2);
  });

  it('gradient-stop-opacity：带 opacity 的 stop 烘焙成 rgba', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'g',
          spec: {
            type: 'linearGradient',
            stops: [
              { offset: 0, color: '#ff0000', opacity: 0.5 },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      ],
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'g' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    const stops = context.calls.filter(c => c.name === 'addColorStop').map(c => c.args);
    expect(stops[0]).toEqual([0, 'rgba(255, 0, 0, 0.5)']);
    expect(stops[1]).toEqual([1, '#0000ff']);
  });

  it('gradient-stop-opacity-named：命名色 stop 经 resolveCssColor 归一后烘焙 alpha（否则退化纯色）', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'g',
          spec: {
            type: 'linearGradient',
            stops: [
              { offset: 0, color: 'darkorange', opacity: 1 },
              { offset: 1, color: 'darkorange', opacity: 0 },
            ],
          },
        },
      ],
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'g' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      resolveCssColor: c => (c === 'darkorange' ? '#ff8c00' : c),
    });

    const stops = context.calls.filter(c => c.name === 'addColorStop').map(c => c.args);
    // opacity 1 → 原样命名色；opacity 0 → 经归一成 hex 再烘焙成 rgba（不再丢 alpha 退化纯色）
    expect(stops[0]).toEqual([0, 'darkorange']);
    expect(stops[1]).toEqual([1, 'rgba(255, 140, 0, 0)']);
  });
});

describe('drawScene 弧扫描方向（缺省按 startAngle/endAngle 推断，与 SVG 一致）', () => {
  it('ellipseArc-sweep-ccw：endAngle < startAngle（如 0→-30 扇形）→ 逆时针短弧而非绕远', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [30, 0] },
            { kind: 'ellipseArc', center: [0, 0], radiusX: 30, radiusY: 30, startAngle: 0, endAngle: -30 },
            { kind: 'line', to: [0, 0] },
            { kind: 'close' },
          ],
          fill: 'lightgray',
          stroke: 'green',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    const ell = context.calls.find(c => c.name === 'ellipse');
    expect(ell).toBeDefined();
    // ctx.ellipse(x, y, rx, ry, rotation, start, end, anticlockwise)：末位推断为 true（30° 短弧，非 330°）
    expect(ell!.args[7]).toBe(true);
  });

  it('ellipseArc-sweep-cw：endAngle > startAngle → 顺时针（anticlockwise=false）', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [30, 0] },
            { kind: 'ellipseArc', center: [0, 0], radiusX: 30, radiusY: 30, startAngle: 0, endAngle: 30 },
          ],
          stroke: 'green',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.find(c => c.name === 'ellipse')!.args[7]).toBe(false);
  });

  it('arc-sweep-ccw：arc 命令 endAngle < startAngle → 逆时针短弧', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [30, 0] },
            { kind: 'arc', center: [0, 0], radius: 30, startAngle: 0, endAngle: -30 },
          ],
          stroke: 'green',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    // ctx.arc(x, y, r, start, end, anticlockwise)：末位推断为 true
    expect(context.calls.find(c => c.name === 'arc')!.args[5]).toBe(true);
  });
});

describe('drawScene clip 裁剪', () => {
  it('clip-rect：group.clipRef 指向 rect 裁剪资源 → 建裁剪路径并 ctx.clip()，子图元随后绘制', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      resources: [{ kind: 'clip', id: 'clip-1', shape: { kind: 'rect', x: 0, y: 0, width: 50, height: 50 } }],
      primitives: [
        {
          type: 'group',
          clipRef: 'clip-1',
          children: [{ type: 'ellipse', cx: 25, cy: 25, rx: 40, ry: 40, fill: '#f00' }],
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'clip')).toBe(true);
    // 裁剪路径用 rect [0,0,50,50]
    expect(context.calls.find(c => c.name === 'rect')?.args).toEqual([0, 0, 50, 50]);
    // 子 ellipse 仍绘制
    expect(context.calls.some(c => c.name === 'ellipse')).toBe(true);
    expect(warnings).not.toContain('clip');
  });

  it('clip-after-transform：裁剪在 group transform 之后应用（与子图元同帧）', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      resources: [{ kind: 'clip', id: 'c', shape: { kind: 'circle', cx: 0, cy: 0, r: 10 } }],
      primitives: [
        {
          type: 'group',
          transforms: [{ kind: 'translate', x: 10, y: 20 }],
          clipRef: 'c',
          children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, fill: '#000' }],
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    const names = context.calls.map(c => c.name);
    const translateIdx = names.indexOf('translate');
    const clipIdx = names.indexOf('clip');
    expect(translateIdx).toBeGreaterThanOrEqual(0);
    expect(clipIdx).toBeGreaterThan(translateIdx);
    // circle 裁剪用 arc
    expect(context.calls.some(c => c.name === 'arc')).toBe(true);
  });

  it('clip-polygon：polygon 裁剪用 moveTo/lineTo/closePath 构建', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      resources: [
        {
          kind: 'clip',
          id: 'poly',
          shape: {
            kind: 'polygon',
            points: [
              [0, 0],
              [50, 0],
              [25, 50],
            ],
          },
        },
      ],
      primitives: [{ type: 'group', clipRef: 'poly', children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10 }] }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.some(c => c.name === 'clip')).toBe(true);
    expect(context.calls.filter(c => c.name === 'lineTo').length).toBeGreaterThanOrEqual(2);
  });

  it('clip-missing-resource：clipRef 指向缺失资源 → 告警 clip 且子图元仍绘制', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [{ type: 'group', clipRef: 'nope', children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10 }] }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(warnings).toContain('clip');
    expect(context.calls.some(c => c.name === 'rect')).toBe(true);
  });
});

describe('drawScene 图片填充', () => {
  const imageScene = (fit?: 'fill' | 'contain' | 'cover'): Scene => ({
    layout: { x: 0, y: 0, width: 200, height: 200 },
    resources: [{ kind: 'paint', id: 'img', spec: { type: 'image', href: 'pic.png', ...(fit ? { fit } : {}) } }],
    primitives: [{ type: 'rect', x: 0, y: 0, width: 200, height: 200, fill: { kind: 'resourceRef', id: 'img' } }],
  });
  const mockImage = { width: 100, height: 50 } as unknown as CanvasImageSource;

  it('image-cover：默认 cover 等比放大覆盖 bbox、clip 到形状、居中', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene(), {
      getImage: () => mockImage,
      warnUnsupported: w => warnings.push(w.feature),
    });

    // cover：scale=max(200/100,200/50)=4 → 400×200，居中到 bbox(200×200) → dx=-100, dy=0
    expect(context.calls.some(c => c.name === 'clip')).toBe(true);
    expect(context.calls.find(c => c.name === 'drawImage')?.args).toEqual([mockImage, -100, 0, 400, 200]);
    expect(warnings).not.toContain('paint');
  });

  it('image-contain：contain 等比缩放装入 bbox、居中', () => {
    const context = createSpyCanvasContext();

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene('contain'), { getImage: () => mockImage });

    // contain：scale=min(2,4)=2 → 200×100，居中 → dx=0, dy=50
    expect(context.calls.find(c => c.name === 'drawImage')?.args).toEqual([mockImage, 0, 50, 200, 100]);
  });

  it('image-fill：fill 拉伸铺满 bbox', () => {
    const context = createSpyCanvasContext();

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene('fill'), { getImage: () => mockImage });

    expect(context.calls.find(c => c.name === 'drawImage')?.args).toEqual([mockImage, 0, 0, 200, 200]);
  });

  it('image-loading：getImage 返回 null（未就绪）→ 本帧不画、不告警', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene(), {
      getImage: () => null,
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'drawImage')).toBe(false);
    expect(warnings).not.toContain('paint');
  });

  it('image-no-loader：未提供 getImage → 降级告警 paint', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene(), {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'drawImage')).toBe(false);
    expect(warnings).toContain('paint');
  });
});

describe('drawScene 图案填充', () => {
  const tileMotif = [
    {
      type: 'path' as const,
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [8, 8] as [number, number] },
      ],
      stroke: '#333',
      strokeWidth: 1,
    },
  ];
  const patternScene = (tileExtra: { background?: string; rotation?: number } = {}): Scene => ({
    layout: { x: 0, y: 0, width: 100, height: 100 },
    resources: [
      {
        kind: 'paint',
        id: 'pat',
        spec: { type: 'pattern', shape: 'lines', size: 8 },
        tile: { size: 8, motif: tileMotif, ...tileExtra },
      },
    ],
    primitives: [{ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: { kind: 'resourceRef', id: 'pat' } }],
  });
  const makeOffscreen = (): SpyCanvasContext => {
    const off = createSpyCanvasContext();
    (off as unknown as { canvas: object }).canvas = { offscreen: true };
    return off;
  };

  it('pattern-basic：离屏渲染 motif tile + createPattern + fill', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    let offSize: Array<number> | undefined;
    const off = makeOffscreen();

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene(), {
      createOffscreen: (w, h) => {
        offSize = [w, h];
        return off as unknown as CanvasRenderingContext2D;
      },
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(offSize).toEqual([8, 8]);
    // motif 画进离屏（描边线段）
    expect(off.calls.some(c => c.name === 'stroke' || c.name === 'fill')).toBe(true);
    expect(context.calls.some(c => c.name === 'createPattern')).toBe(true);
    expect(context.calls.some(c => c.name === 'fill')).toBe(true);
    expect(warnings).not.toContain('paint');
  });

  it('pattern-background：tile.background → 离屏 fillRect 底色', () => {
    const context = createSpyCanvasContext();
    const off = makeOffscreen();

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene({ background: '#eee' }), {
      createOffscreen: () => off as unknown as CanvasRenderingContext2D,
    });

    expect(off.calls.find(c => c.name === 'fillRect')?.args).toEqual([0, 0, 8, 8]);
  });

  it('pattern-rotation：tile.rotation → pattern.setTransform', () => {
    const context = createSpyCanvasContext();
    const off = makeOffscreen();

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene({ rotation: 45 }), {
      createOffscreen: () => off as unknown as CanvasRenderingContext2D,
    });

    expect(context.calls.some(c => c.name === 'patternSetTransform')).toBe(true);
  });

  it('pattern-no-offscreen：未提供 createOffscreen → 降级告警 paint', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene(), {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'createPattern')).toBe(false);
    expect(warnings).toContain('paint');
  });
});

describe('drawScene fill/stroke "none"', () => {
  it('none-no-paint：fill/stroke="none" 不绘制，且不继承前一个图元的样式', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 20, height: 20, fill: '#000', stroke: '#000' },
        { type: 'ellipse', cx: 50, cy: 20, rx: 10, ry: 10, fill: 'none', stroke: 'none' },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    // 只有第一个 rect 填充 / 描边；fill="none" / stroke="none" 的 ellipse 一律不画
    expect(context.calls.filter(c => c.name === 'fill').length).toBe(1);
    expect(context.calls.filter(c => c.name === 'stroke').length).toBe(1);
  });

  it('text-fill-none：文本 fill="none" 不绘制文字', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 20, height: 20, fill: '#123456' },
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'X' }],
          fontSize: 12,
          align: 'start',
          baseline: 'top',
          lineHeight: 14,
          measuredWidth: 12,
          measuredHeight: 14,
          fill: 'none',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.some(c => c.name === 'fillText')).toBe(false);
  });
});
