// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HydrationHandlers } from '@retikz/render/hydration';
import { Layout, Node } from '../../src';
import { buildIR } from '../../src/kernel/builder';

/**
 * 水合：JSX 模式下 `handlers` prop 被忽略（契约）
 * @description <Layout> 的 `handlers` prop 仅在 `ir` prop 模式生效（无 JSX children 可收集时按 id 提供注册表）。
 *   JSX/标记组件模式下事件经组件自身的 `on<Event>` props 收集，错误传入的 `handlers` prop 应被静默忽略、不报错、
 *   也不参与分发。对照组验证 `ir` prop 模式下 `handlers` prop 确实生效，钉死两条路径的分工。
 */

const SIZE = 200;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JSX 模式 handlers prop 契约', () => {
  it('JSX children + 误传 handlers prop：只走 JSX 的 on<Event>，handlers prop 被忽略', async () => {
    const fromJsx = vi.fn();
    const fromHandlersProp = vi.fn();
    const bogusHandlers: HydrationHandlers = { a: { click: fromHandlersProp } };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE} handlers={bogusHandlers}>
          <Node id="a" position={[0, 0]} fill="red" minimumSize={2} onClick={fromJsx} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="a"]');
    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // JSX 路径触发；handlers prop 完全没参与（即便它也注册了 id="a" 的 click）
    expect(fromJsx).toHaveBeenCalledTimes(1);
    expect(fromHandlersProp).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });

  it('JSX children 上无 on<Event> + 误传 handlers prop：handlers prop 不补位，点击无任何回调', async () => {
    const fromHandlersProp = vi.fn();
    const bogusHandlers: HydrationHandlers = { a: { click: fromHandlersProp } };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE} handlers={bogusHandlers}>
          <Node id="a" position={[0, 0]} fill="red" minimumSize={2} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="a"]');
    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fromHandlersProp).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });

  it('对照：ir prop 模式下 handlers prop 生效（同一 prop 仅此路径有效）', async () => {
    const fromHandlersProp = vi.fn();
    const ir = buildIR(<Node id="a" position={[0, 0]} fill="red" minimumSize={2} />);
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
