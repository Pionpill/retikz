import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

/** 构造非正方形 rect 的 gradient stroke 场景 */
const gradientRectScene = (kind: 'linearGradient' | 'radialGradient' | 'conicGradient'): Scene => ({
  layout: { x: 0, y: 0, width: 120, height: 80 },
  resources: [
    {
      kind: 'paint',
      id: 'gradient',
      spec: {
        kind,
        angle: kind === 'linearGradient' ? 45 : undefined,
        stops: [
          { offset: 0, color: '#fff' },
          { offset: 1, color: '#000' },
        ],
      },
    },
  ],
  primitives: [
    {
      type: 'rect',
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      stroke: { kind: 'resourceRef', id: 'gradient' },
      strokeWidth: 4,
    },
  ],
});

describe('drawScene 渐变描边', () => {
  it('non-square radial stroke uses an offscreen no-repeat pattern without scaling stroke geometry', () => {
    const context = createSpyCanvasContext();
    const offscreen = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 120, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'r',
          spec: {
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [10, 20] },
            { kind: 'line', to: [90, 20] },
            { kind: 'line', to: [90, 60] },
            { kind: 'line', to: [10, 60] },
            { kind: 'close' },
          ],
          stroke: { kind: 'resourceRef', id: 'r' },
          strokeWidth: 8,
          strokeLinecap: 'square',
          strokeLinejoin: 'miter',
          dashPattern: [5, 3],
          dashOffset: 2,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      createOffscreen: () => offscreen as unknown as CanvasRenderingContext2D,
    });

    expect(context.calls.some(call => call.name === 'createPattern')).toBe(true);
    expect(context.calls.some(call => call.name === 'patternSetTransform')).toBe(true);
    expect(context.calls.find(call => call.name === 'patternSetTransform')?.args[0]).toMatchObject({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: -32,
      f: -22,
    });
    expect(offscreen.calls.find(call => call.name === 'createRadialGradient')?.args).toEqual([
      0.5, 0.5, 0, 0.5, 0.5, 0.5,
    ]);
    expect(context.calls.filter(call => call.name === 'stroke')).toHaveLength(1);
    expect(context.calls.find(call => call.name === 'stroke')?.lineWidth).toBe(8);
    expect(context.calls.find(call => call.name === 'setLineDash')?.args).toEqual([[5, 3]]);
    expect(context.calls.some(call => call.name === 'scale')).toBe(false);
  });

  it('falls back to a native approximation with one warning when offscreen is unavailable', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    const s: Scene = {
      layout: { x: 0, y: 0, width: 120, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'r',
          spec: {
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [10, 20] },
            { kind: 'line', to: [90, 20] },
            { kind: 'line', to: [90, 60] },
            { kind: 'line', to: [10, 60] },
            { kind: 'close' },
          ],
          stroke: { kind: 'resourceRef', id: 'r' },
          strokeWidth: 4,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      warnUnsupported: warning => warnings.push(warning.feature),
    });

    expect(context.calls.some(call => call.name === 'createPattern')).toBe(false);
    expect(context.calls.some(call => call.name === 'createRadialGradient')).toBe(true);
    expect(context.calls.filter(call => call.name === 'stroke')).toHaveLength(1);
    expect(warnings).toEqual(['paint']);
  });

  it('reuses the same gradient stroke texture within one drawScene call', () => {
    const context = createSpyCanvasContext();
    const offscreens: Array<ReturnType<typeof createSpyCanvasContext>> = [];
    const path = {
      type: 'path' as const,
      commands: [
        { kind: 'move' as const, to: [10, 20] as [number, number] },
        { kind: 'line' as const, to: [90, 20] as [number, number] },
        { kind: 'line' as const, to: [90, 60] as [number, number] },
        { kind: 'line' as const, to: [10, 60] as [number, number] },
        { kind: 'close' as const },
      ],
      stroke: { kind: 'resourceRef' as const, id: 'r' },
      strokeWidth: 4,
    };
    const s: Scene = {
      layout: { x: 0, y: 0, width: 120, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'r',
          spec: {
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [path, path],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      createOffscreen: (width, height) => {
        const offscreen = createSpyCanvasContext(width, height);
        offscreens.push(offscreen);
        return offscreen as unknown as CanvasRenderingContext2D;
      },
    });

    expect(offscreens).toHaveLength(1);
    expect(context.calls.filter(call => call.name === 'createPattern')).toHaveLength(1);
    expect(context.calls.filter(call => call.name === 'stroke')).toHaveLength(2);
  });

  it('caps extreme gradient textures by edge and total pixel budgets', () => {
    const context = createSpyCanvasContext();
    const sizes: Array<[number, number]> = [];
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100000, height: 50000 },
      resources: [
        {
          kind: 'paint',
          id: 'r',
          spec: {
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 100000,
          height: 50000,
          stroke: { kind: 'resourceRef', id: 'r' },
          strokeWidth: 2,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      createOffscreen: (width, height) => {
        sizes.push([width, height]);
        return createSpyCanvasContext(width, height) as unknown as CanvasRenderingContext2D;
      },
    });

    expect(sizes).toHaveLength(1);
    const [width, height] = sizes[0];
    expect(width).toBeLessThanOrEqual(2048);
    expect(height).toBeLessThanOrEqual(2048);
    expect(width * height).toBeLessThanOrEqual(1_048_576);
  });

  it.each(['linearGradient', 'radialGradient', 'conicGradient'] as const)(
    'skips %s stroke for a degenerate bbox with one paint warning',
    kind => {
      const context = createSpyCanvasContext();
      const warnings: Array<string> = [];
      const scene = gradientRectScene(kind);
      const primitive = scene.primitives[0];
      if (primitive.type !== 'rect') throw new Error('Expected rect primitive');
      primitive.width = 0;

      drawScene(context as unknown as CanvasRenderingContext2D, scene, {
        warnUnsupported: warning => warnings.push(warning.feature),
      });

      expect(context.calls.some(call => call.name.startsWith('create') && call.name.includes('Gradient'))).toBe(false);
      expect(context.calls.some(call => call.name === 'createPattern')).toBe(false);
      expect(context.calls.some(call => call.name === 'stroke')).toBe(false);
      expect(warnings).toEqual(['paint']);
    },
  );

  it('silently skips texture allocation for a singular current transform', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    let offscreenCalls = 0;
    context.setTransform(0, 0, 0, 1, 0, 0);

    drawScene(context as unknown as CanvasRenderingContext2D, gradientRectScene('radialGradient'), {
      createOffscreen: () => {
        offscreenCalls += 1;
        return createSpyCanvasContext() as unknown as CanvasRenderingContext2D;
      },
      warnUnsupported: warning => warnings.push(warning.feature),
    });

    expect(offscreenCalls).toBe(0);
    expect(warnings).toEqual([]);
  });

  it('warns and skips texture allocation for a non-finite current transform', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    let offscreenCalls = 0;
    context.setTransform(Number.POSITIVE_INFINITY, 0, 0, 1, 0, 0);

    drawScene(context as unknown as CanvasRenderingContext2D, gradientRectScene('radialGradient'), {
      createOffscreen: () => {
        offscreenCalls += 1;
        return createSpyCanvasContext() as unknown as CanvasRenderingContext2D;
      },
      warnUnsupported: warning => warnings.push(warning.feature),
    });

    expect(offscreenCalls).toBe(0);
    expect(warnings).toEqual(['paint']);
  });

  it('does not mistake a tiny but highly non-square bbox for a square', () => {
    const context = createSpyCanvasContext();
    let offscreenCalls = 0;
    const scene = gradientRectScene('radialGradient');
    const primitive = scene.primitives[0];
    if (primitive.type !== 'rect') throw new Error('Expected rect primitive');
    primitive.width = 1e-8;
    primitive.height = 1e-9;

    drawScene(context as unknown as CanvasRenderingContext2D, scene, {
      createOffscreen: (width, height) => {
        offscreenCalls += 1;
        return createSpyCanvasContext(width, height) as unknown as CanvasRenderingContext2D;
      },
    });

    expect(offscreenCalls).toBe(1);
    expect(context.calls.some(call => call.name === 'createPattern')).toBe(true);
  });

  it('path stroke resourceRef：Canvas stroke 使用同源 linearGradient', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'g',
          spec: {
            kind: 'linearGradient',
            angle: 90,
            stops: [
              { offset: 0, color: '#000' },
              { offset: 1, color: '#fff' },
            ],
          },
        },
      ],
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [100, 50] },
          ],
          stroke: { kind: 'resourceRef', id: 'g' },
          strokeWidth: 3,
          dashPattern: [4, 2],
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(
      (context.calls.find(c => c.name === 'createLinearGradient')?.args as Array<number>).map(n => Math.round(n)),
    ).toEqual([50, 0, 50, 50]);
    expect(context.calls.filter(c => c.name === 'addColorStop').map(c => c.args)).toEqual([
      [0, '#000'],
      [1, '#fff'],
    ]);
    const stroke = context.calls.find(c => c.name === 'stroke');
    expect(stroke?.lineWidth).toBe(3);
    expect(context.calls.find(c => c.name === 'setLineDash')?.args).toEqual([[4, 2]]);
  });
});
