import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

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
