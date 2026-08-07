import type { Scene } from '@retikz/core';

import { describe, expect, it, vi } from 'vitest';

import type { RenderReadonlyLayer } from '../../src/runtime';

import { renderFrameToCanvas, renderToCanvas } from '../../src/canvas';

type CanvasCall = {
  name: string;
  args: Array<unknown>;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
};

type SpyCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'beginPath'
  | 'clearRect'
  | 'clip'
  | 'createLinearGradient'
  | 'createPattern'
  | 'fill'
  | 'fillText'
  | 'lineTo'
  | 'moveTo'
  | 'rect'
  | 'restore'
  | 'save'
  | 'setLineDash'
  | 'setTransform'
  | 'stroke'
  | 'transform'
> & {
  calls: Array<CanvasCall>;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
};

const createSpyCanvasContext = (): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  const record =
    (name: string) =>
    (...args: Array<unknown>) => {
      calls.push({
        name,
        args,
        fillStyle: context.fillStyle,
        globalAlpha: context.globalAlpha,
        lineWidth: context.lineWidth,
        strokeStyle: context.strokeStyle,
      });
    };

  const context: SpyCanvasContext = {
    calls,
    fillStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '#000',
    beginPath: record('beginPath'),
    clearRect: record('clearRect'),
    clip: record('clip'),
    createLinearGradient: (...args: Array<unknown>) => {
      record('createLinearGradient')(...args);
      return { addColorStop: vi.fn() };
    },
    createPattern: (...args: Array<unknown>) => {
      record('createPattern')(...args);
      return { setTransform: vi.fn() };
    },
    fill: record('fill'),
    fillText: record('fillText'),
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    rect: record('rect'),
    restore: record('restore'),
    save: record('save'),
    setLineDash: record('setLineDash'),
    setTransform: record('setTransform'),
    stroke: record('stroke'),
    transform: record('transform'),
  };
  return context;
};

const createCanvas = (context: CanvasRenderingContext2D | null) => {
  const getContext = vi.fn((contextId: string) => (contextId === '2d' ? context : null));
  const canvas = {
    width: 300,
    height: 150,
    getContext,
  };

  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    getContext,
  };
};

const frameScene: Scene = {
  layout: { x: 10, y: 20, width: 100, height: 50 },
  primitives: [{ type: 'rect', x: 10, y: 20, width: 12, height: 8, fill: '#f00' }],
};

describe('renderToCanvas 规格', () => {
  it('render frame 在同一 fit/DPR transform 下先绘制 primary、再顺序绘制 readonly layers', () => {
    const context = createSpyCanvasContext();
    const { canvas } = createCanvas(context as unknown as CanvasRenderingContext2D);
    const layers: ReadonlyArray<RenderReadonlyLayer> = [
      {
        key: 'first',
        transform: [1, 0, 0, 1, 12, 8],
        scene: {
          layout: { x: 0, y: 0, width: 26, height: 8 },
          resources: [
            {
              kind: 'paint',
              id: 'paint-1',
              spec: {
                kind: 'linearGradient',
                stops: [
                  { offset: 0, color: '#7c3aed' },
                  { offset: 1, color: '#ffffff' },
                ],
              },
            },
          ],
          primitives: [
            {
              type: 'path',
              commands: [
                { kind: 'move', to: [0, 0] },
                { kind: 'line', to: [20, 0] },
              ],
              stroke: '#7c3aed',
              dashPattern: [1, 4],
            },
            {
              type: 'rect',
              x: 22,
              y: 2,
              width: 4,
              height: 6,
              fill: { kind: 'resourceRef', id: 'paint-1' },
            },
          ],
        },
      },
      {
        key: 'second',
        transform: [1, 0, 0, 1, -4, 6],
        scene: {
          layout: { x: 0, y: 0, width: 12, height: 12 },
          resources: [
            {
              kind: 'paint',
              id: 'paint-1',
              spec: { kind: 'pattern', shape: 'lines', size: 8 },
              tile: {
                size: 8,
                motif: [
                  {
                    type: 'path',
                    commands: [
                      { kind: 'move', to: [0, 0] },
                      { kind: 'line', to: [8, 8] },
                    ],
                    stroke: '#dc2626',
                    strokeWidth: 1,
                  },
                ],
              },
            },
          ],
          primitives: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              width: 12,
              height: 12,
              fill: { kind: 'resourceRef', id: 'paint-1' },
            },
          ],
        },
      },
    ];
    const offscreen = createSpyCanvasContext();
    Object.assign(offscreen, { canvas: {} });

    renderFrameToCanvas(
      canvas,
      { primary: frameScene, layers },
      {
        devicePixelRatio: 2,
        createOffscreen: () => offscreen as unknown as CanvasRenderingContext2D,
      },
    );

    const rectIndex = context.calls.findIndex(call => call.name === 'rect');
    const lineIndex = context.calls.findIndex(call => call.name === 'lineTo');
    expect(rectIndex).toBeGreaterThanOrEqual(0);
    expect(lineIndex).toBeGreaterThan(rectIndex);
    const fillIndices = context.calls.flatMap((call, index) => (call.name === 'fill' ? [index] : []));
    expect(fillIndices).toHaveLength(3);
    expect(context.calls.some(call => call.name === 'createLinearGradient')).toBe(true);
    expect(context.calls.some(call => call.name === 'createPattern')).toBe(true);
    expect(context.calls).toContainEqual(expect.objectContaining({ name: 'transform', args: [1, 0, 0, 1, 12, 8] }));
    expect(context.calls.filter(call => call.name === 'setTransform')).toHaveLength(2);
    expect(context.calls.filter(call => call.name === 'setTransform')[1].args).toEqual([3, 0, 0, 3, -30, -60]);
  });

  it('render-to-canvas-frame：获取 2d context，按 DPR 和 viewBox 设置帧，再 clear 后绘制', () => {
    const context = createSpyCanvasContext();
    const { canvas, getContext } = createCanvas(context as unknown as CanvasRenderingContext2D);

    renderToCanvas(canvas, frameScene, { devicePixelRatio: 2 });

    expect(getContext).toHaveBeenCalledWith('2d');
    expect(context.calls.map(call => call.name).filter(name => name !== 'save' && name !== 'restore')).toEqual([
      'setTransform',
      'clearRect',
      'setTransform',
      'beginPath',
      'rect',
      'fill',
    ]);
    expect(context.calls[0].args).toEqual([1, 0, 0, 1, 0, 0]);
    expect(context.calls[1].args).toEqual([0, 0, 300, 150]);
    expect(context.calls[2].args).toEqual([3, 0, 0, 3, -30, -60]);
  });

  it('viewbox-meet-fit：画布宽高比不一致时保持等比缩放并居中', () => {
    const context = createSpyCanvasContext();
    const { canvas } = createCanvas(context as unknown as CanvasRenderingContext2D);
    canvas.height = 200;
    const wideScene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      primitives: [],
    };

    renderToCanvas(canvas, wideScene, { devicePixelRatio: 1 });

    expect(context.calls.filter(call => call.name === 'setTransform')[1].args).toEqual([3, 0, 0, 3, 0, 25]);
  });

  it('empty-scene-canvas：空 Scene 只清屏和设置帧，不发出绘制命令', () => {
    const context = createSpyCanvasContext();
    const { canvas } = createCanvas(context as unknown as CanvasRenderingContext2D);
    const emptyScene: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 30 },
      primitives: [],
    };

    expect(() => renderToCanvas(canvas, emptyScene)).not.toThrow();
    expect(context.calls.map(call => call.name)).toEqual(['setTransform', 'clearRect', 'setTransform']);
    expect(context.calls[1].args).toEqual([0, 0, 300, 150]);
  });

  it('no-2d-context：拿不到 Canvas 2D context 时抛出可诊断错误', () => {
    const { canvas } = createCanvas(null);

    expect(() => renderToCanvas(canvas, frameScene)).toThrow(/2d context|CanvasRenderingContext2D|canvas/i);
  });

  it('non-finite-frame-transform：非法 DPR 或布局尺寸不会把 NaN / Infinity 写入 transform', () => {
    const context = createSpyCanvasContext();
    const { canvas } = createCanvas(context as unknown as CanvasRenderingContext2D);
    const badFrameScene: Scene = {
      layout: { x: 0, y: 0, width: 0, height: 50 },
      primitives: [],
    };

    expect(() => renderToCanvas(canvas, badFrameScene, { devicePixelRatio: Number.NaN })).toThrow(
      /layout|width|height|finite|positive/i,
    );
    expect(context.calls.flatMap(call => call.args).every(arg => typeof arg !== 'number' || Number.isFinite(arg))).toBe(
      true,
    );
  });

  it('non-finite-layout-origin-transform：非法 layout origin 不会写入 transform', () => {
    const context = createSpyCanvasContext();
    const { canvas } = createCanvas(context as unknown as CanvasRenderingContext2D);
    const badOriginScene: Scene = {
      layout: { x: Number.NaN, y: 0, width: 100, height: 50 },
      primitives: [],
    };

    expect(() => renderToCanvas(canvas, badOriginScene)).toThrow(/layout|x|finite/i);
    expect(context.calls.flatMap(call => call.args).every(arg => typeof arg !== 'number' || Number.isFinite(arg))).toBe(
      true,
    );
  });
});
