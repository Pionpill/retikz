// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type HydrationContext, Layout, Node } from '../src';

/**
 * ADR-01 水合：SVG 模式事件绑定（端到端）
 * @description <Layout renderer="svg"> 渲染真实 SVG（图元带 data-retikz-id）；点击该图元 DOM 应触发对应 id 的
 *   handler（经 collectHydrationHandlers 收集 → createHydrationController + locateSvg 根级委托绑定）。
 *   stub 阶段收集 / 接线未实装，断言此刻预期 fail。
 */

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SVG 水合', () => {
  it('点击带 id 的节点 DOM → 对应 onClick 触发', async () => {
    const onClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={200} height={200}>
          <Node id="a" position={[0, 0]} fill="red" minimumSize={2} onClick={onClick} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="a"]');
    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    root.unmount();
    container.remove();
  });

  it('onClick 收到 (event, context)：context 带 id / meta / geometry / renderer / element', async () => {
    let context: HydrationContext | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={200} height={200}>
          <Node id="a" position={[0, 0]} fill="red" minimumSize={2} meta={{ series: 'sales', i: 3 }} onClick={(_event, received) => { context = received; }} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="a"]');
    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(context?.id).toBe('a');
    expect(context?.renderer).toBe('svg');
    expect(context?.meta).toEqual({ series: 'sales', i: 3 });
    expect(context?.element).not.toBeNull();
    expect(context?.geometry?.bbox.width).toBeGreaterThan(0);
    expect(typeof context?.animation.restart).toBe('function');

    root.unmount();
    container.remove();
  });

  it('未注册 handler 的节点被点击 → 不抛、无副作用', async () => {
    const onClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={200} height={200}>
          <Node id="a" position={[0, 0]} fill="red" minimumSize={2} onClick={onClick} />
          <Node id="b" position={[4, 0]} fill="blue" minimumSize={2} />
        </Layout>,
      );
    });

    const other = container.querySelector('[data-retikz-id="b"]');
    expect(other).not.toBeNull();

    await act(() => {
      other!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClick).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });
});
