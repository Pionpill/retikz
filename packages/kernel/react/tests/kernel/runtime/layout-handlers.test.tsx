// @vitest-environment jsdom
import type { HydrationHandlers } from '@retikz/render/hydration';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node } from '../../../src';
import { normalizeReactInput } from '../../helpers/normalize-input';

const SIZE = 200;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JSX 模式 handlers prop 契约', () => {
  it('同一事件先调用 JSX 回调，再调用显式 handlers', async () => {
    const fromJsx = vi.fn();
    const fromHandlersProp = vi.fn();
    const handlers: HydrationHandlers = { a: { click: fromHandlersProp } };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE} handlers={handlers}>
          <Node id="a" position={[0, 0]} onClick={fromJsx} style={{ fill: 'red' }} layout={{ minimumSize: 2 }} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="a"]');

    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fromJsx.mock.invocationCallOrder[0]).toBeLessThan(fromHandlersProp.mock.invocationCallOrder[0]);
    expect(fromJsx).toHaveBeenCalledTimes(1);
    expect(fromHandlersProp).toHaveBeenCalledOnce();

    root.unmount();
    container.remove();
  });

  it('JSX 子元素没有回调时使用显式 handlers', async () => {
    const fromHandlersProp = vi.fn();
    const handlers: HydrationHandlers = { a: { click: fromHandlersProp } };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE} handlers={handlers}>
          <Node id="a" position={[0, 0]} style={{ fill: 'red' }} layout={{ minimumSize: 2 }} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="a"]');

    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fromHandlersProp).toHaveBeenCalledOnce();

    root.unmount();
    container.remove();
  });

  it('完整 IR 使用显式 handlers', async () => {
    const fromHandlersProp = vi.fn();
    const ir = normalizeReactInput(
      <Node id="a" position={[0, 0]} style={{ fill: 'red' }} layout={{ minimumSize: 2 }} />,
    );
    const handlers: HydrationHandlers = { a: { click: fromHandlersProp } };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(<Layout renderer="svg" width={SIZE} height={SIZE} ir={ir} handlers={handlers} />);
    });

    const target = container.querySelector('[data-retikz-id="a"]');

    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fromHandlersProp).toHaveBeenCalledTimes(1);

    root.unmount();
    container.remove();
  });
});
