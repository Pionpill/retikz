import type { Scene } from '@retikz/core';

export type CanvasCall = {
  name: string;
  args: Array<unknown>;
  font?: string;
  fillStyle?: string | CanvasGradient | CanvasPattern;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineWidth?: number;
  lineDashOffset?: number;
  strokeStyle?: string | CanvasGradient | CanvasPattern;
};

export type SpyCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'arc'
  | 'beginPath'
  | 'bezierCurveTo'
  | 'clearRect'
  | 'clip'
  | 'closePath'
  | 'createLinearGradient'
  | 'createConicGradient'
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
  lineDashOffset: number;
  lineJoin: CanvasLineJoin;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
};

export const createSpyCanvasContext = (): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  const stack: Array<Pick<SpyCanvasContext, 'font' | 'lineCap' | 'lineDashOffset' | 'lineJoin' | 'lineWidth'>> = [];
  const context = {
    calls,
    fillStyle: '#000',
    font: '',
    globalAlpha: 1,
    lineCap: 'butt',
    lineDashOffset: 0,
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as SpyCanvasContext;
  const record =
    (name: string) =>
    (...args: Array<unknown>) => {
      if (name === 'save') {
        stack.push({
          font: context.font,
          lineCap: context.lineCap,
          lineDashOffset: context.lineDashOffset,
          lineJoin: context.lineJoin,
          lineWidth: context.lineWidth,
        });
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
        lineDashOffset: context.lineDashOffset,
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
    createConicGradient: (...args: Array<unknown>) => {
      record('createConicGradient')(...args);
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

export const scene: Scene = {
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

/** stealth 实心箭头（`arrow="->"` 默认形状）的已解析 marker 描述：refX=3 / baseSize=10 / 6×6 / 实心三角 contextStroke */
export const stealthSpec = {
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
