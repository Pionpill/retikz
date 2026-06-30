import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

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

    // center 默认 (0.5,0.5) → (40,40)，radius 默认 0.5 → 0.5*max(80,80)=40
    expect(context.calls.find(c => c.name === 'createRadialGradient')?.args).toEqual([40, 40, 0, 40, 40, 40]);
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

    expect(context.calls.find(c => c.name === 'createConicGradient')?.args).toEqual([-Math.PI / 2, 30, 40]);
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
