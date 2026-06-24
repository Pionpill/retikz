// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

describe('browserMeasurer 默认字体族', () => {
  it('继承页面默认 font-family 作为测量兜底', async () => {
    vi.resetModules();
    const body = document.body;
    const previousFontFamily = body.style.fontFamily;
    body.style.fontFamily = 'Inter, sans-serif';

    const measureText = vi.fn(
      () =>
        ({
          width: 12,
          actualBoundingBoxAscent: 8,
          actualBoundingBoxDescent: 2,
        }) as TextMetrics,
    );
    const context = {
      font: '',
      measureText,
    };
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) =>
      (contextId === '2d' ? (context as unknown as CanvasRenderingContext2D) : null),
    );

    try {
      const { browserMeasurer } = await import('../../src/render/browser-measurer');
      browserMeasurer('abc', { size: 14 });

      expect(context.font).toBe('normal normal 14px Inter, sans-serif');
    } finally {
      body.style.fontFamily = previousFontFamily;
      getContextSpy.mockRestore();
    }
  });

  it('显式 font.family 仍然优先于页面默认字体族', async () => {
    vi.resetModules();
    const measureText = vi.fn(
      () =>
        ({
          width: 12,
          actualBoundingBoxAscent: 8,
          actualBoundingBoxDescent: 2,
        }) as TextMetrics,
    );
    const context = {
      font: '',
      measureText,
    };
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) =>
      (contextId === '2d' ? (context as unknown as CanvasRenderingContext2D) : null),
    );

    try {
      const { browserMeasurer } = await import('../../src/render/browser-measurer');
      browserMeasurer('abc', { size: 14, family: 'monospace' });

      expect(context.font).toBe('normal normal 14px monospace');
    } finally {
      getContextSpy.mockRestore();
    }
  });
});
