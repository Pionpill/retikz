import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

describe('drawScene fill/stroke "none"', () => {
  it('none-no-paint：fill/stroke="none" 不绘制，且不继承前一个图元的样式', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 20, height: 20, fill: '#000', stroke: '#000' },
        { type: 'ellipse', cx: 50, cy: 20, rx: 10, ry: 10, fill: 'none', stroke: 'none' },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    // 只有第一个 rect 填充 / 描边；fill="none" / stroke="none" 的 ellipse 一律不画
    expect(context.calls.filter(c => c.name === 'fill').length).toBe(1);
    expect(context.calls.filter(c => c.name === 'stroke').length).toBe(1);
  });

  it('text-fill-none：文本 fill="none" 不绘制文字', () => {
    const context = createSpyCanvasContext();
    const s: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        { type: 'rect', x: 0, y: 0, width: 20, height: 20, fill: '#123456' },
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'X' }],
          fontSize: 12,
          align: 'start',
          baseline: 'top',
          lineHeight: 14,
          measuredWidth: 12,
          measuredHeight: 14,
          fill: 'none',
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, s);

    expect(context.calls.some(c => c.name === 'fillText')).toBe(false);
  });
});
