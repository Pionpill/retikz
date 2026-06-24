// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '@retikz/core';
import { hitTest } from '../src/canvas';

/**
 * hitTest 兜底 2D context 复用：未传 context2d 时，跨多次调用只懒建一个离屏 canvas，
 * 避免高频 pointermove 每次 `document.createElement('canvas')` 的 GC 压力。
 */

const scene: Scene = {
  layout: { x: 0, y: 0, width: 10, height: 10 },
  primitives: [{ type: 'rect', id: 'r', x: 0, y: 0, width: 10, height: 10, fill: '#000' }],
};

describe('hitTest 兜底 context 复用', () => {
  it('多次调用只创建一次 canvas（jsdom 无原生 canvas，stub getContext）', () => {
    // jsdom 未装 canvas 包，getContext 默认抛/未实现——stub 成返回一个最小 2D context，
    // 既避免噪声错误，又能真实校验「跨多次调用只懒建一个离屏 canvas」。
    const stubCtx = {
      save: () => undefined,
      restore: () => undefined,
      beginPath: () => undefined,
      rect: () => undefined,
      isPointInPath: () => false,
      isPointInStroke: () => false,
    } as unknown as CanvasRenderingContext2D;
    const origCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'canvas') {
        Object.assign(el, { getContext: () => stubCtx });
      }
      return el;
    });

    for (let i = 0; i < 5; i++) hitTest(scene, { x: 1, y: 1 });

    const canvasCreations = spy.mock.calls.filter(([tag]) => tag === 'canvas').length;
    expect(canvasCreations).toBeLessThanOrEqual(1);
    spy.mockRestore();
  });
});
