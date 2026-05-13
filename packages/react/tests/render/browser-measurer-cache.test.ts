// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

describe('browser-measurer 模块级 canvas 单例', () => {
  it('连续调用 measurer → canvas 仅 createElement 一次（模块级单例复用）', async () => {
    vi.resetModules();
    // mock getContext → null：避免 jsdom 未实现 canvas 2d 触发 stderr 噪音；
    // browserMeasurer 见 ctx=null 走 fallbackMeasurer，但模块级 canvas 仍 createElement 一次，
    // 后续调用复用同一 canvas 不再 createElement——这正是要验证的单例契约
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    const createElementSpy = vi.spyOn(document, 'createElement');
    try {
      const { browserMeasurer } = await import('../../src/render/browser-measurer');
      browserMeasurer('a', { size: 12 });
      browserMeasurer('bc', { size: 14 });
      browserMeasurer('def', { size: 16 });

      const canvasCalls = createElementSpy.mock.calls.filter(c => c[0] === 'canvas');
      expect(canvasCalls).toHaveLength(1);
    } finally {
      createElementSpy.mockRestore();
      getContextSpy.mockRestore();
    }
  });
});
