// @vitest-environment jsdom
import type { CircleProps } from '../src/shape';

type HydrationContext = Parameters<NonNullable<CircleProps['onClick']>>[1];
import { Layout } from '@retikz/react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Circle, Rectangle, Star, Sector } from '../src/shape';

/**
 * 水合：Standard 形状组件事件全链 DOM 派发（端到端）
 * @description 现有 collectHydrationHandlers 测试只覆盖「收集」阶段。本文件验证 Standard 形状（Circle / Rectangle /
 *   Star）上的 `on<Event>` props 经 <Layout> 真实渲染后，对底层挂点 DOM 派发真实事件 → handler 被调用且拿到正确
 *   context（id / meta / renderer / element / geometry / animation）。Standard 的 id 透传给底层 <Path>，故挂点
 *   DOM 带 `data-retikz-id` = Standard 的 id
 */

const SIZE = 200;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Standard 形状事件全链 DOM 派发', () => {
  it('updates ring geometry when an authored inner radius is removed', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onDiagnostic = vi.fn();
    const render = (innerRadius?: number) => (
      <Layout renderer="svg" runtime={{ onDiagnostic }} width={200} height={200}>
        <Sector id="sector" center={[0, 0]} radius={30} innerRadius={innerRadius} startAngle={0} endAngle={90} />
      </Layout>
    );
    await act(() => root.render(render(15)));
    const before = container.querySelector('[data-retikz-id="sector"]')?.outerHTML;
    await act(() => root.render(render()));
    expect(onDiagnostic.mock.calls).toEqual([]);
    expect(container.querySelector('[data-retikz-id="sector"]')?.outerHTML).not.toEqual(before);
    await act(() => root.unmount());
    container.remove();
  });
  it('点击 <Circle id onClick> 底层挂点 DOM → onClick 触发一次', async () => {
    const onClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="svg" width={SIZE} height={SIZE}>
          <Circle id="ring" center={[0, 0]} radius={20} onClick={onClick} style={{ fill: 'red' }} />
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

  it('<Circle onClick> 收到 (event, context)：context.id 为 Standard 的 id、带 meta / renderer / element / geometry', async () => {
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
            meta={{ series: 'donut', i: 2 }}
            onClick={(_event, received) => {
              context = received;
            }}
            style={{ fill: 'red' }}
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
          <Rectangle
            id="box"
            corner1={[0, 0]}
            corner2={[40, 30]}
            onPointerEnter={onPointerEnter}
            style={{ fill: 'blue' }}
          />
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
          <Star
            id="s"
            center={[0, 0]}
            outerRadius={30}
            innerRadius={12}
            points={5}
            style={{ fill: 'gold' }}
            onPointerDown={onPointerDown}
          />
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
