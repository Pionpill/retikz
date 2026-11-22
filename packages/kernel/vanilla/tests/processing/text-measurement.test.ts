// @vitest-environment jsdom
import { fallbackMeasurer } from '@retikz/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { compileToScene, compileToSceneAsync } from '../../src';
import { prepareProcessingInput } from '../../src/runtime/_input/prepare';

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
    const custom = vi.fn(() => ({ width: 80, height: 16 }));
    const prepared = prepareProcessingInput(source, { compile: { measureText: custom } });
    const font = { size: 16 };
    expect(prepared.coreOptions.measureText?.('Alpha', font)).toEqual({ width: 80, height: 16 });
    expect(custom).toHaveBeenLastCalledWith('Alpha', font);
    prepared.coreOptions.measureText?.('Alpha', { size: 16, family: 'monospace' });
    expect(custom).toHaveBeenLastCalledWith('Alpha', { size: 16, family: 'monospace' });
    prepared.coreOptions.measureText?.('Alpha', font, true);
    expect(custom).toHaveBeenLastCalledWith('Alpha', font, true);
    expect(font).toEqual({ size: 16 });
    expect(getContext).not.toHaveBeenCalled();
  });

  it.each(['null', 'throw'] as const)('Canvas 上下文不可用时估算：%s', mode => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      if (mode === 'throw') throw new Error('Canvas unavailable');
      return null;
    });
    const prepared = prepareProcessingInput(source, {});
    expect(prepared.coreOptions.measureText?.('Alpha', { size: 16 })).toEqual(fallbackMeasurer('Alpha', { size: 16 }));
  });

  it('Canvas 度量进入同步与异步准备，实际测量异常不降级', async () => {
    const measureText = vi.fn(() => ({ width: 91, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 3 }));
    const context = { font: '', measureText };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    document.body.style.fontFamily = 'serif';
    expect(prepareProcessingInput(source, {}).coreOptions.measureText?.('Alpha', { size: 16 })).toEqual({
      width: 91,
      height: 15,
      ascent: 12,
      descent: 3,
    });
    const sync = compileToScene(source, {});
    const asyncResult = await compileToSceneAsync(source, {});
    expect(asyncResult.compileResult.scene).toEqual(sync.compileResult.scene);
    expect(context.font).toBe('normal normal 16px serif');
    const failure = new Error('measurement failed');
    measureText.mockImplementation(() => {
      throw failure;
    });
    expect(() => prepareProcessingInput(source, {}).coreOptions.measureText?.('Alpha', { size: 16 })).toThrow(failure);
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
