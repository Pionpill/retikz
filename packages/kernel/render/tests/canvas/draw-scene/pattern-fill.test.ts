import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { SpyCanvasContext } from './helpers';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

describe('drawScene 图案填充', () => {
  const tileMotif = [
    {
      type: 'path' as const,
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [8, 8] as [number, number] },
      ],
      stroke: '#333',
      strokeWidth: 1,
    },
  ];
  const patternScene = (tileExtra: { background?: string; rotation?: number } = {}): Scene => ({
    layout: { x: 0, y: 0, width: 100, height: 100 },
    resources: [
      {
        kind: 'paint',
        id: 'pat',
        spec: { kind: 'pattern', shape: 'lines', size: 8 },
        tile: { size: 8, motif: tileMotif, ...tileExtra },
      },
    ],
    primitives: [{ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: { kind: 'resourceRef', id: 'pat' } }],
  });
  const makeOffscreen = (): SpyCanvasContext => {
    const off = createSpyCanvasContext();
    (off as unknown as { canvas: object }).canvas = { offscreen: true };
    return off;
  };

  it('pattern-basic：离屏渲染 motif tile + createPattern + fill', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    let offSize: Array<number> | undefined;
    const off = makeOffscreen();

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene(), {
      createOffscreen: (w, h) => {
        offSize = [w, h];
        return off as unknown as CanvasRenderingContext2D;
      },
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(offSize).toEqual([8, 8]);
    // motif 画进离屏（描边线段）
    expect(off.calls.some(c => c.name === 'stroke' || c.name === 'fill')).toBe(true);
    expect(context.calls.some(c => c.name === 'createPattern')).toBe(true);
    expect(context.calls.some(c => c.name === 'fill')).toBe(true);
    expect(warnings).not.toContain('paint');
  });

  it('pattern-background：tile.background → 离屏 fillRect 底色', () => {
    const context = createSpyCanvasContext();
    const off = makeOffscreen();

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene({ background: '#eee' }), {
      createOffscreen: () => off as unknown as CanvasRenderingContext2D,
    });

    expect(off.calls.find(c => c.name === 'fillRect')?.args).toEqual([0, 0, 8, 8]);
  });

  it('pattern-rotation：tile.rotation → pattern.setTransform', () => {
    const context = createSpyCanvasContext();
    const off = makeOffscreen();

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene({ rotation: 45 }), {
      createOffscreen: () => off as unknown as CanvasRenderingContext2D,
    });

    expect(context.calls.some(c => c.name === 'patternSetTransform')).toBe(true);
  });

  it('pattern-no-offscreen：未提供 createOffscreen → 降级告警 paint', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, patternScene(), {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'createPattern')).toBe(false);
    expect(warnings).toContain('paint');
  });
});
