// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

describe('browser-measurer 模块级 canvas 单例', () => {
  it('连续调用 measurer → canvas 仅 createElement 一次（模块级单例复用）', async () => {
    vi.resetModules();
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
    }
  });
});
