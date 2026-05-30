import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '@retikz/core';
import { renderToCanvas } from '../src';

type CanvasCall = {
  name: string;
  args: Array<unknown>;
};

type SpyCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'beginPath'
  | 'clearRect'
  | 'fill'
  | 'fillText'
  | 'rect'
  | 'restore'
  | 'save'
  | 'setLineDash'
  | 'setTransform'
  | 'stroke'
> & {
  calls: Array<CanvasCall>;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
};

const createSpyCanvasContext = (): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  const record = (name: string) => (...args: Array<unknown>) => {
    calls.push({ name, args });
  };

  return {
    calls,
    fillStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '#000',
    beginPath: record('beginPath'),
    clearRect: record('clearRect'),
    fill: record('fill'),
    fillText: record('fillText'),
    rect: record('rect'),
    restore: record('restore'),
    save: record('save'),
    setLineDash: record('setLineDash'),
    setTransform: record('setTransform'),
    stroke: record('stroke'),
  };
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

    expect(() => renderToCanvas(canvas, badFrameScene, { devicePixelRatio: Number.NaN })).toThrow(/layout|width|height|finite|positive/i);
    expect(context.calls.flatMap(call => call.args).every(arg => typeof arg !== 'number' || Number.isFinite(arg))).toBe(true);
  });

  it('non-finite-layout-origin-transform：非法 layout origin 不会写入 transform', () => {
    const context = createSpyCanvasContext();
    const { canvas } = createCanvas(context as unknown as CanvasRenderingContext2D);
    const badOriginScene: Scene = {
      layout: { x: Number.NaN, y: 0, width: 100, height: 50 },
      primitives: [],
    };

    expect(() => renderToCanvas(canvas, badOriginScene)).toThrow(/layout|x|finite/i);
    expect(context.calls.flatMap(call => call.args).every(arg => typeof arg !== 'number' || Number.isFinite(arg))).toBe(true);
  });
});
