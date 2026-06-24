import { Buffer } from 'node:buffer';
import type { Scene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

type CanvasCall = {
  name: string;
  args: Array<unknown>;
};

type SpyCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'beginPath'
  | 'clearRect'
  | 'fill'
  | 'fillRect'
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

const contexts: Array<SpyCanvasContext> = [];
const encodes: Array<{ width: number; height: number; format: string; quality?: number }> = [];

const createContext = (): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  const record = (name: string) => (...args: Array<unknown>) => calls.push({ name, args });
  const context: SpyCanvasContext = {
    calls,
    fillStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '#000',
    beginPath: record('beginPath'),
    clearRect: record('clearRect'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    fillText: record('fillText'),
    rect: record('rect'),
    restore: record('restore'),
    save: record('save'),
    setLineDash: record('setLineDash'),
    setTransform: record('setTransform'),
    stroke: record('stroke'),
  };
  contexts.push(context);
  return context;
};

vi.mock(
  '@napi-rs/canvas',
  () => ({
    createCanvas: (width: number, height: number) => {
      const context = createContext();
      return {
        width,
        height,
        getContext: (contextId: string) => (contextId === '2d' ? context : null),
        encode: (format: string, quality?: number) => {
          encodes.push({ width, height, format, quality });
          return Buffer.from(`retikz:${format}:${width}x${height}`);
        },
      };
    },
  }),
);

const scene: Scene = {
  layout: { x: 10, y: 20, width: 100, height: 50 },
  primitives: [{ type: 'rect', x: 10, y: 20, width: 12, height: 8, fill: '#f00' }],
};

describe('renderSceneToImage', () => {
  it('renders a Scene into an encoded Node canvas image buffer', async () => {
    const { renderSceneToImage } = await import('../src/canvas-node');

    const buffer = await renderSceneToImage(scene, {
      width: 200,
      height: 100,
      devicePixelRatio: 2,
      format: 'webp',
      quality: 80,
      background: '#fff',
    });

    expect(buffer.toString()).toBe('retikz:webp:400x200');
    expect(encodes.at(-1)).toEqual({ width: 400, height: 200, format: 'webp', quality: 80 });
    expect(contexts[0].calls[0]).toEqual({ name: 'setTransform', args: [1, 0, 0, 1, 0, 0] });
    expect(contexts[0].calls[1]).toEqual({ name: 'fillRect', args: [0, 0, 400, 200] });
    expect(contexts[0].calls[2]).toEqual({ name: 'setTransform', args: [4, 0, 0, 4, -40, -80] });
    expect(contexts[0].calls.map(call => call.name)).toContain('rect');
    expect(contexts[0].calls.map(call => call.name)).toContain('fill');
  });

  it('validates output dimensions before loading the optional peer', async () => {
    const { renderSceneToImage } = await import('../src/canvas-node');

    await expect(renderSceneToImage(scene, { width: 0, height: 100 })).rejects.toThrow(/width must be a positive finite number/);
  });
});
