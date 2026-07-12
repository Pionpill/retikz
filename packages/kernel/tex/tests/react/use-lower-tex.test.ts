/// <reference lib="dom" />

// @vitest-environment jsdom
import type { LowerTex } from '@retikz/core';
import type { Root } from 'react-dom/client';

import { createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createMathJaxEngineMock } = vi.hoisted(() => ({ createMathJaxEngineMock: vi.fn() }));

vi.mock('../../src/mathjax', () => ({ createMathJaxEngine: createMathJaxEngineMock }));

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
  it('共享初始化失败只报告一次原始错误，后续挂载会重试', async () => {
    const installError = new Error('@retikz/tex: install the optional peer dependency "mathjax-full".');
    const engine = { convert: vi.fn(() => '<svg />') };
    createMathJaxEngineMock.mockRejectedValueOnce(installError).mockResolvedValueOnce(engine);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const values: Array<LowerTex | undefined> = [];
    const Probe = () => {
      values.push(useLowerTex());
      return null;
    };

    const failedRoot = await mount(createElement(Fragment, null, createElement(Probe), createElement(Probe)));

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[retikz/tex] Failed to initialize MathJax.', installError);

    await act(() => failedRoot.unmount());
    roots.delete(failedRoot);
    await mount(createElement(Probe));

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(2);
    expect(typeof values.at(-1)).toBe('function');
  });
});
