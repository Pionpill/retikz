import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { drawScene } from '../src/canvas/draw-scene';

/**
 * canvas 文本 fill 基线：缺省 fill 的文本必须用确定黑色（与 SVG 省略 fill 的默认一致），
 * 不能继承 ctx 上残留的 fillStyle（上一帧 / 上个 prim）。锁定 drawText 的确定基线修复。
 */

/** 最小记录型 2D context：fillText 时捕获当前 fillStyle，其余方法 no-op */
const makeRecordingCtx = (captured: Array<string>): CanvasRenderingContext2D => {
  const state: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineWidth: 1,
  };
  return new Proxy(state, {
    get(target, prop) {
      if (prop === 'fillText') return () => captured.push(String(target.fillStyle));
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop() {} });
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop in target) return target[prop as string];
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
};

const textScene = (fill?: string): Scene => ({
  layout: { x: 0, y: 0, width: 100, height: 100 },
  primitives: [
    {
      type: 'text',
      x: 0,
      y: 50,
      lines: [{ text: 'hi' }],
      fontSize: 12,
      align: 'start',
      baseline: 'alphabetic',
      lineHeight: 14,
      measuredWidth: 10,
      measuredHeight: 14,
      ...(fill !== undefined ? { fill } : {}),
    },
  ],
});

describe('canvas drawText fill 基线', () => {
  it('缺省 fill 的文本用确定黑色，不继承 ctx 残留色', () => {
    const captured: Array<string> = [];
    const ctx = makeRecordingCtx(captured);
    ctx.fillStyle = '#ff0000'; // 模拟上一帧 / 上个 prim 残留脏色
    drawScene(ctx, textScene(), {});
    expect(captured).toEqual(['#000000']);
  });

  it('显式 fill 的文本用指定色', () => {
    const captured: Array<string> = [];
    const ctx = makeRecordingCtx(captured);
    drawScene(ctx, textScene('#00ff00'), {});
    expect(captured).toEqual(['#00ff00']);
  });
});
