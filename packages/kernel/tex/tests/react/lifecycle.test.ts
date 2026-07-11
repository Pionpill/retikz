/// <reference lib="dom" />

// @vitest-environment jsdom
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MathJaxSvgEngine } from '../../src';

const { createLowerTexMock, createMathJaxEngineMock } = vi.hoisted(() => ({
  createLowerTexMock: vi.fn(),
  createMathJaxEngineMock: vi.fn(),
}));

vi.mock('../../src/lower', () => ({ createLowerTex: createLowerTexMock }));
vi.mock('../../src/mathjax', () => ({ createMathJaxEngine: createMathJaxEngineMock }));

import { useLowerTex } from '../../src/react';

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  createLowerTexMock.mockReset();
  createMathJaxEngineMock.mockReset();
});

describe('useLowerTex lifecycle', () => {
  it('组件卸载后引擎才就绪时不创建 lowerer', async () => {
    let resolveEngine: ((engine: MathJaxSvgEngine) => void) | undefined;
    createMathJaxEngineMock.mockReturnValue(
      new Promise<MathJaxSvgEngine>(resolve => {
        resolveEngine = resolve;
      }),
    );
    const Probe = () => {
      useLowerTex();
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(createElement(Probe)));
    await act(() => root.unmount());
    await act(async () => {
      resolveEngine?.({ convert: () => '<svg />' });
      await Promise.resolve();
    });

    expect(createLowerTexMock).not.toHaveBeenCalled();
  });
});
