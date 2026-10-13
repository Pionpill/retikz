// @vitest-environment jsdom

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, expect, it, vi } from 'vitest';

import { PreviewErrorBoundary } from '../../src/modules/docs/components/component-preview/PreviewErrorBoundary';
import { PreviewViewport } from '../../src/modules/docs/components/component-preview/PreviewViewport';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it('屏幕外不挂载示例，接近视口后挂载并保留交互状态', () => {
  let notify: (visible: boolean) => void = () => undefined;

  class ViewportObserver {
    constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
      notify = visible => callback([{ isIntersecting: visible }]);
    }

    observe() {}

    disconnect() {}
  }

  vi.stubGlobal('IntersectionObserver', ViewportObserver);

  const Counter = () => {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <PreviewViewport name="counter" size="xl">
        <Counter />
      </PreviewViewport>,
    ),
  );

  expect(container.querySelector('button')).toBeNull();
  expect(container.querySelector('[data-preview-viewport="pending"]')).not.toBeNull();

  act(() => notify(false));

  expect(container.querySelector('button')).toBeNull();

  act(() => notify(true));
  const button = container.querySelector('button');
  act(() => button?.click());

  expect(button?.textContent).toBe('1');

  act(() => notify(false));

  expect(container.querySelector('button')).toBe(button);
  expect(button?.textContent).toBe('1');

  act(() => root.unmount());
});

it('不支持可见性观察时仍展示示例', () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() =>
    root.render(
      <PreviewViewport name="demo" size="md">
        <span>Demo</span>
      </PreviewViewport>,
    ),
  );

  expect(container.textContent).toBe('Demo');

  act(() => root.unmount());
});

it('单个预览失败保留错误详情且不卸载相邻示例', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const Broken = (): never => {
    throw new Error('demo compile failed');
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    act(() =>
      root.render(
        <>
          <PreviewErrorBoundary>
            <Broken />
          </PreviewErrorBoundary>
          <PreviewErrorBoundary>
            <svg aria-label="healthy demo" />
          </PreviewErrorBoundary>
        </>,
      ),
    );
    expect(container.querySelector('[data-demo-error]')?.textContent).toContain('demo compile failed');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('healthy demo');
  } finally {
    act(() => root.unmount());
    spy.mockRestore();
  }
});
