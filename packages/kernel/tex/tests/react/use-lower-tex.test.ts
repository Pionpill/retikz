/// <reference lib="dom" />

// @vitest-environment jsdom
import type { Root } from 'react-dom/client';

import { createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as MathJaxModule from '../../src/mathjax';

const { createMathJaxEngineMock } = vi.hoisted(() => ({ createMathJaxEngineMock: vi.fn() }));

vi.mock('../../src/mathjax', async importOriginal => ({
  ...(await importOriginal<typeof MathJaxModule>()),
  createMathJaxEngine: createMathJaxEngineMock,
}));

import type { MathJaxLowerTexState } from '../../src/react';

import { useLowerTex } from '../../src/react';

const roots = new Set<Root>();

const mount = async (node: React.ReactNode): Promise<Root> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  await act(async () => {
    root.render(node);
    await Promise.resolve();
  });
  return root;
};

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  createMathJaxEngineMock.mockReset();
});

afterEach(async () => {
  for (const root of roots) {
    await act(() => root.unmount());
  }
  roots.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('useLowerTex', () => {
  it('共享初始化失败不会被无诊断回调的首个订阅者吞掉', async () => {
    const initializationError = new Error('@retikz/tex: failed to initialize MathJax.');
    createMathJaxEngineMock.mockRejectedValueOnce(initializationError);
    const diagnostics: Array<{ kind: string; message: string }> = [];
    const SilentProbe = () => {
      useLowerTex();
      return null;
    };
    const DiagnosticProbe = () => {
      useLowerTex({ onDiagnostic: diagnostic => diagnostics.push(diagnostic) });
      return null;
    };

    await mount(createElement(Fragment, null, createElement(SilentProbe), createElement(DiagnosticProbe)));

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(1);
    expect(diagnostics).toEqual([{ kind: 'engine-error', source: '', message: initializationError.message }]);
  });

  it('共享初始化失败只报告一次原始错误，后续挂载会重试', async () => {
    const initializationError = new Error('@retikz/tex: failed to initialize MathJax.');
    const engine = { convert: vi.fn(() => '<svg />') };
    createMathJaxEngineMock.mockRejectedValueOnce(initializationError).mockResolvedValueOnce(engine);
    const diagnostics: Array<{ kind: string; message: string }> = [];
    const values: Array<MathJaxLowerTexState> = [];
    const Probe = () => {
      values.push(useLowerTex({ onDiagnostic: diagnostic => diagnostics.push(diagnostic) }));
      return null;
    };

    const failedRoot = await mount(createElement(Fragment, null, createElement(Probe), createElement(Probe)));

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(1);
    expect(diagnostics).toEqual([{ kind: 'engine-error', source: '', message: initializationError.message }]);
    expect(values.at(-1)).toMatchObject({
      status: 'error',
      diagnostic: { kind: 'engine-error', source: '', message: initializationError.message },
    });

    await act(() => failedRoot.unmount());
    roots.delete(failedRoot);
    await mount(createElement(Probe));

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(2);
    expect(values.at(-1)).toMatchObject({ status: 'ready', lowerTex: expect.any(Function) });
  });
});
