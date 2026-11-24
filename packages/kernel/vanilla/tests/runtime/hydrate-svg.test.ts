// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';
import type { HydrationContext } from '@retikz/render/hydration';
import { describe, expect, it, vi } from 'vitest';

import { mountSceneView } from '../../src/dom';

/** 带可点击图元 id 的最小 IR（矩形 Node，便于 SVG 输出有 data-retikz-id 挂点） */
const idIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'a',
      position: [0, 0],
      shape: 'rectangle',
      layout: { minimumSize: { width: 40, height: 20 } },
    },
  ],
};

/** 带 meta provenance 的 Node IR（验 context.meta / context.geometry） */
const metaIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'a',
      position: [0, 0],
      shape: 'rectangle',
      meta: { series: 'sales', i: 3 },
      layout: { minimumSize: { width: 40, height: 20 } },
    },
  ],
};

/** 在容器内找到带指定 data-retikz-id 的 DOM 元素 */
const findById = (container: Element, id: string): Element | null =>
  container.querySelector(`[data-retikz-id="${id}"]`);

describe('@retikz/vanilla hydrate（SVG 水合）', () => {
  it('hydrate-click：mount 后点击带 data-retikz-id 的图元 → 对应 handler 触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSceneView(container, idIr);
    const onClick = vi.fn();
    view.hydrate({ handlers: { a: { click: onClick } } });

    const target = findById(view.root, 'a');

    expect(target).not.toBeNull();

    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(1);

    container.remove();
  });

  it('view.hydrate-context：handler 收到 (event, context) 富上下文（id / meta / geometry / element）', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSceneView(container, metaIr);
    let context: HydrationContext | undefined;
    view.hydrate({
      handlers: {
        a: {
          click: (_event, received) => {
            context = received;
          },
        },
      },
    });

    const target = findById(view.root, 'a');
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(context?.id).toBe('a');
    expect(context?.renderer).toBe('svg');
    expect(context?.meta).toEqual({ series: 'sales', i: 3 });
    expect(context?.element).not.toBeNull();
    expect(context?.geometry?.bbox.width).toBeGreaterThan(0);
    expect(typeof context?.animation.restart).toBe('function');

    container.remove();
  });

  it('dispose-detaches：dispose 后点击不再触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSceneView(container, idIr);
    const onClick = vi.fn();
    const handle = view.hydrate({ handlers: { a: { click: onClick } } });
    handle.dispose();

    const target = findById(view.root, 'a');

    expect(target).not.toBeNull();

    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).not.toHaveBeenCalled();

    container.remove();
  });

  it('view-dispose-detaches-hydration：view.dispose 后未手动 dispose 的水合也解绑、点击不再触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSceneView(container, idIr);
    const onClick = vi.fn();
    view.hydrate({ handlers: { a: { click: onClick } } });
    const root = view.root;
    view.dispose();

    // root 已移除；即便再派发事件也不触发（listener 随 view.dispose 解绑）
    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).not.toHaveBeenCalled();

    container.remove();
  });
});
