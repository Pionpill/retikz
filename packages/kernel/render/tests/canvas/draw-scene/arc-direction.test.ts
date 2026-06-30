import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

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
