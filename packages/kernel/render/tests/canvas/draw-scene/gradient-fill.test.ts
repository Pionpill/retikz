import type { Scene } from '@retikz/core';

import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

describe('drawScene 渐变填充', () => {
  it('non-square radial gradient uses unit coordinates under the bbox transform', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'r-unit',
          spec: {
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 10, y: 20, width: 80, height: 40, fill: { kind: 'resourceRef', id: 'r-unit' } }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.find(call => call.name === 'transform')?.args).toEqual([80, 0, 0, 40, 10, 20]);
    expect(context.calls.find(call => call.name === 'createRadialGradient')?.args).toEqual([
      0.5, 0.5, 0, 0.5, 0.5, 0.5,
    ]);
    expect(context.calls.some(call => call.name === 'createPattern')).toBe(false);
  });

  it('rasterizes equal normalized radial distances to matching colors on a non-square bbox', () => {
    const canvas = createCanvas(100, 60);
    const context = canvas.getContext('2d');
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 60 },
      resources: [
        {
          kind: 'paint',
          id: 'radial-raster',
          spec: {
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#ffffff' },
              { offset: 1, color: '#000000' },
            ],
          },
        },
      ],
      primitives: [
        { type: 'rect', x: 10, y: 10, width: 80, height: 40, fill: { kind: 'resourceRef', id: 'radial-raster' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    const horizontal = context.getImageData(70, 30, 1, 1).data[0];
    const vertical = context.getImageData(50, 40, 1, 1).data[0];
    expect(Math.abs(horizontal - vertical)).toBeLessThanOrEqual(3);
    expect(horizontal).toBeGreaterThan(110);
    expect(horizontal).toBeLessThan(145);
  });

  it('diagonal linear gradient is also created in the unit bbox', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'l-unit',
          spec: {
            kind: 'linearGradient',
            angle: 45,
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 10, y: 20, width: 80, height: 40, fill: { kind: 'resourceRef', id: 'l-unit' } }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.find(call => call.name === 'transform')?.args).toEqual([80, 0, 0, 40, 10, 20]);
    const args = context.calls.find(call => call.name === 'createLinearGradient')?.args as Array<number>;
    expect(args[0]).toBeCloseTo(0.14644661);
    expect(args[1]).toBeCloseTo(0.14644661);
    expect(args[2]).toBeCloseTo(0.85355339);
    expect(args[3]).toBeCloseTo(0.85355339);
  });

  it('uses the true path geometry bbox for gradient mapping', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 220, height: 120 },
      resources: [
        {
          kind: 'paint',
          id: 'path-radial',
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
            { kind: 'move', to: [0, 0] },
            { kind: 'quad', control: [100, 100], to: [200, 0] },
          ],
          fill: { kind: 'resourceRef', id: 'path-radial' },
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.find(call => call.name === 'transform')?.args).toEqual([200, 0, 0, 50, 0, 0]);
  });

  it('appends the local bbox transform without resetting the parent CTM', () => {
    const context = createSpyCanvasContext();
    context.setTransform(2, 0, 0, 3, 5, 7);
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 80 },
      resources: [
        {
          kind: 'paint',
          id: 'parent-ctm',
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
        { type: 'rect', x: 10, y: 20, width: 80, height: 40, fill: { kind: 'resourceRef', id: 'parent-ctm' } },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.filter(call => call.name === 'setTransform')).toHaveLength(1);
    expect(context.calls.find(call => call.name === 'transform')?.args).toEqual([80, 0, 0, 40, 10, 20]);
    expect(context.getTransform()).toMatchObject({ a: 2, b: 0, c: 0, d: 3, e: 5, f: 7 });
  });

  it.each(['linearGradient', 'radialGradient', 'conicGradient'] as const)(
    'skips %s fill for a degenerate bbox with one paint warning',
    kind => {
      const context = createSpyCanvasContext();
      const warnings: Array<string> = [];
      const s: Scene = {
        layout: { x: 0, y: 0, width: 20, height: 20 },
        resources: [
          {
            kind: 'paint',
            id: 'degenerate',
            spec: {
              kind,
              stops: [
                { offset: 0, color: '#fff' },
                { offset: 1, color: '#000' },
              ],
            },
          },
        ],
        primitives: [
          { type: 'rect', x: 0, y: 0, width: 0, height: 10, fill: { kind: 'resourceRef', id: 'degenerate' } },
        ],
      };

      drawScene(context as unknown as CanvasRenderingContext2D, s, {
        warnUnsupported: warning => warnings.push(warning.feature),
      });

      expect(context.calls.some(call => call.name.startsWith('create') && call.name.includes('Gradient'))).toBe(false);
      expect(warnings).toEqual(['paint']);
    },
  );

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
            kind: 'linearGradient',
            stops: [
              { offset: 0, color: '#f00' },
              { offset: 1, color: '#00f' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'paint-1' } }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s, {
      warnUnsupported: w => warnings.push(w.feature),
    });

    // gradient 在单位方框创建，再由 bbox transform 映射到 (0,0,100,50)
    expect(context.calls.find(c => c.name === 'transform')?.args).toEqual([100, 0, 0, 50, 0, 0]);
    expect(context.calls.find(c => c.name === 'createLinearGradient')?.args).toEqual([0, 0.5, 1, 0.5]);
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
            kind: 'linearGradient',
            angle: 90,
            stops: [
              { offset: 0, color: '#000' },
              { offset: 1, color: '#fff' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'g' } }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    const args = context.calls.find(c => c.name === 'createLinearGradient')?.args as Array<number>;
    expect(args[0]).toBeCloseTo(0.5);
    expect(args[1]).toBeCloseTo(0);
    expect(args[2]).toBeCloseTo(0.5);
    expect(args[3]).toBeCloseTo(1);
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
            kind: 'radialGradient',
            stops: [
              { offset: 0, color: '#fff' },
              { offset: 1, color: '#000' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 0, y: 0, width: 80, height: 80, fill: { kind: 'resourceRef', id: 'r' } }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.find(c => c.name === 'createRadialGradient')?.args).toEqual([0.5, 0.5, 0, 0.5, 0.5, 0.5]);
    expect(context.calls.filter(c => c.name === 'addColorStop').length).toBe(2);
  });

  it('conic-gradient: rect fill maps bbox center to createConicGradient', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 50 },
      resources: [
        {
          kind: 'paint',
          id: 'c',
          spec: {
            kind: 'conicGradient',
            center: [0.25, 0.5],
            angle: -90,
            stops: [
              { offset: 0, color: '#ff0' },
              { offset: 0.5, color: '#06c' },
              { offset: 1, color: '#f30' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 10, y: 20, width: 80, height: 40, fill: { kind: 'resourceRef', id: 'c' } }],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.find(c => c.name === 'createConicGradient')?.args).toEqual([-Math.PI / 2, 0.25, 0.5]);
    expect(context.calls.filter(c => c.name === 'addColorStop').map(c => c.args)).toEqual([
      [0, '#ff0'],
      [0.5, '#06c'],
      [1, '#f30'],
    ]);
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
            kind: 'linearGradient',
            stops: [
              { offset: 0, color: '#ff0000', opacity: 0.5 },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'g' } }],
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
            kind: 'linearGradient',
            stops: [
              { offset: 0, color: 'darkorange', opacity: 1 },
              { offset: 1, color: 'darkorange', opacity: 0 },
            ],
          },
        },
      ],
      primitives: [{ type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: { kind: 'resourceRef', id: 'g' } }],
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
