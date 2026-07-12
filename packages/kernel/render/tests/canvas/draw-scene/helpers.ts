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
  | 'transform'
  | 'translate'
> & {
  canvas: HTMLCanvasElement;
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
  getTransform: () => DOMMatrix;
};

type MatrixValues = { a: number; b: number; c: number; d: number; e: number; f: number };

const multiplyMatrix = (left: MatrixValues, right: MatrixValues): MatrixValues => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f,
});

export const createSpyCanvasContext = (width = 300, height = 150): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  let matrix: MatrixValues = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack: Array<
    Pick<
      SpyCanvasContext,
      'fillStyle' | 'font' | 'globalAlpha' | 'lineCap' | 'lineDashOffset' | 'lineJoin' | 'lineWidth' | 'strokeStyle'
    > & { matrix: MatrixValues }
  > = [];
  const context = {
    canvas: { width, height },
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
          fillStyle: context.fillStyle,
          font: context.font,
          globalAlpha: context.globalAlpha,
          lineCap: context.lineCap,
          lineDashOffset: context.lineDashOffset,
          lineJoin: context.lineJoin,
          lineWidth: context.lineWidth,
          matrix: { ...matrix },
          strokeStyle: context.strokeStyle,
        });
      }
      if (name === 'restore') {
        const snapshot = stack.pop();
        if (snapshot) {
          matrix = snapshot.matrix;
          Object.assign(context, snapshot);
        }
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
    getTransform: () => ({ ...matrix }) as DOMMatrix,
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    rect: record('rect'),
    restore: record('restore'),
    rotate: (angle: number) => {
      record('rotate')(angle);
      matrix = multiplyMatrix(matrix, {
        a: Math.cos(angle),
        b: Math.sin(angle),
        c: -Math.sin(angle),
        d: Math.cos(angle),
        e: 0,
        f: 0,
      });
    },
    save: record('save'),
    scale: (x: number, y: number) => {
      record('scale')(x, y);
      matrix = multiplyMatrix(matrix, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 });
    },
    setLineDash: record('setLineDash'),
    setTransform: (...args: Array<unknown>) => {
      record('setTransform')(...args);
      if (args.length === 6 && args.every(value => typeof value === 'number')) {
        const [a, b, c, d, e, f] = args;
        matrix = { a, b, c, d, e, f };
      }
    },
    stroke: record('stroke'),
    transform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
      record('transform')(a, b, c, d, e, f);
      matrix = multiplyMatrix(matrix, { a, b, c, d, e, f });
    },
    translate: (x: number, y: number) => {
      record('translate')(x, y);
      matrix = multiplyMatrix(matrix, { a: 1, b: 0, c: 0, d: 1, e: x, f: y });
    },
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
