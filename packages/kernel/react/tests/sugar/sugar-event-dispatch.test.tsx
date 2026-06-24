// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Circle, type HydrationContext, Layout, Rectangle, Star } from '../../src';

/**
 * 水合：Sugar 形状组件事件全链 DOM 派发（端到端）
 * @description 现有 collectHydrationHandlers 测试只覆盖「收集」阶段。本文件验证 Sugar 形状（Circle / Rectangle /
 *   Star）上的 `on<Event>` props 经 <Layout> 真实渲染后，对底层挂点 DOM 派发真实事件 → handler 被调用且拿到正确
 *   context（id / meta / renderer / element / geometry / animation）。Sugar 的 id 透传给底层 <Path>，故挂点
 *   DOM 带 `data-retikz-id` = Sugar 的 id。
 */

const SIZE = 200;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Sugar 形状事件全链 DOM 派发', () => {
  it('点击 <Circle id onClick> 底层挂点 DOM → onClick 触发一次', async () => {
    const onClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE}>
          <Circle id="ring" center={[0, 0]} radius={20} fill="red" onClick={onClick} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="ring"]');
    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    root.unmount();
    container.remove();
  });

  it('<Circle onClick> 收到 (event, context)：context.id 为 Sugar 的 id、带 meta / renderer / element / geometry', async () => {
    let context: HydrationContext | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE}>
          <Circle
            id="ring"
            center={[0, 0]}
            radius={20}
            fill="red"
            meta={{ series: 'donut', i: 2 }}
            onClick={(_event, received) => {
              context = received;
            }}
          />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="ring"]');
    await act(() => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(context?.id).toBe('ring');
    expect(context?.renderer).toBe('svg');
    expect(context?.meta).toEqual({ series: 'donut', i: 2 });
    expect(context?.element).not.toBeNull();
    expect(context?.geometry?.bbox.width).toBeGreaterThan(0);
    expect(typeof context?.animation.restart).toBe('function');

    root.unmount();
    container.remove();
  });

  it('<Rectangle onPointerEnter>：对挂点 DOM 派发 pointermove → 合成 pointerEnter 触发', async () => {
    const onPointerEnter = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE}>
          <Rectangle id="box" corner1={[0, 0]} corner2={[40, 30]} fill="blue" onPointerEnter={onPointerEnter} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="box"]');
    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    });

    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(onPointerEnter.mock.calls[0][1].id).toBe('box');

    root.unmount();
    container.remove();
  });

  it('<Star onPointerDown>：对挂点 DOM 派发 pointerdown → onPointerDown 触发', async () => {
    const onPointerDown = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE}>
          <Star id="s" center={[0, 0]} outerRadius={30} innerRadius={12} points={5} fill="gold" onPointerDown={onPointerDown} />
        </Layout>,
      );
    });

    const target = container.querySelector('[data-retikz-id="s"]');
    expect(target).not.toBeNull();

    await act(() => {
      target!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown.mock.calls[0][1].id).toBe('s');

    root.unmount();
    container.remove();
  });
});
