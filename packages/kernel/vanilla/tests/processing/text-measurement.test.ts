// @vitest-environment jsdom
import { fallbackMeasurer } from '@retikz/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { compileToScene } from '../../src';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.fontFamily = '';
});

const source = {
  type: 'scene' as const,
  children: [{ type: 'node' as const, text: ['Alpha'], position: [0, 0] as [number, number] }],
};

describe('默认文字测量', () => {
  it('显式测量器直接消费原始字体参数，不探测 Canvas', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const custom = vi.fn(fallbackMeasurer);
    compileToScene(source, { compile: { measureText: custom } });
    expect(custom.mock.calls.some(([text, font]) => text === 'Alpha' && font.size === 16)).toBe(true);
    expect(getContext).not.toHaveBeenCalled();
  });

  it.each(['null', 'throw'] as const)('Canvas 上下文不可用时估算：%s', mode => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      if (mode === 'throw') throw new Error('Canvas unavailable');
      return null;
    });
    expect(compileToScene(source).scene).toEqual(
      compileToScene(source, { compile: { measureText: fallbackMeasurer } }).scene,
    );
    expect(getContext).toHaveBeenCalledOnce();
  });

  it('Canvas 度量进入编译，实际测量异常不降级', () => {
    const measureText = vi.fn(() => ({ width: 91, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 3 }));
    const context = { font: '', measureText };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    document.body.style.fontFamily = 'serif';
    const measured = compileToScene(source);
    const explicit = compileToScene(source, {
      compile: { measureText: () => ({ width: 91, height: 15, ascent: 12, descent: 3 }) },
    });
    expect(measured.scene).toEqual(explicit.scene);
    expect(context.font).toBe('normal normal 16px serif');
    const failure = new Error('measurement failed');
    measureText.mockImplementation(() => {
      throw failure;
    });
    expect(() => compileToScene(source)).toThrow(/measurement failed/);
  });

  it('自定义异常与非法度量不能被替换成正常 Scene', () => {
    expect(() =>
      compileToScene(source, {
        compile: {
          measureText: () => {
            throw new Error('custom failed');
          },
        },
      }),
    ).toThrow();
    expect(() => compileToScene(source, { compile: { measureText: () => ({ width: -1, height: 16 }) } })).toThrow();
  });
});
