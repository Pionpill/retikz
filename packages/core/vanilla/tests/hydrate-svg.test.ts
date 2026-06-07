// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { type IR, compileToScene } from '@retikz/core';
import { type HydrationContext, hydrate, mountSvg, renderToSvgString } from '../src';

/**
 * @retikz/vanilla hydrate（SVG 水合，jsdom 环境）
 * @description mountSvg / SSR 先渲染出含 data-retikz-id 的图，hydrate 再把 handler 经根级 closest 委托绑回图元。
 *   stub 阶段 hydrate 恒返回空 dispose、不绑任何 listener，故触发类断言此刻预期 fail；dispose 类断言预期 pass。
 */

/** 带可点击图元 id 的最小 IR（矩形 Node，便于 SVG 输出有 data-retikz-id 挂点） */
const idIr: IR = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20 },
  ],
};

/** 带 meta provenance 的 Node IR（验 context.meta / context.geometry） */
const metaIr: IR = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, meta: { series: 'sales', i: 3 } },
  ],
};

/** 在容器内找到带指定 data-retikz-id 的 DOM 元素 */
const findById = (container: Element, id: string): Element | null =>
  container.querySelector(`[data-retikz-id="${id}"]`);

describe('@retikz/vanilla hydrate（SVG 水合）', () => {
  it('hydrate-click：mountSvg 后点击带 data-retikz-id 的图元 → 对应 handler 触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSvg(container, idIr);
    const onClick = vi.fn();
    hydrate(view.root, { handlers: { a: { click: onClick } } });

    const target = findById(view.root, 'a');
    expect(target).not.toBeNull();
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);

    container.remove();
  });

  it('ssr-then-hydrate：renderToSvgString 产静态串 → 注入 DOM → hydrate 绑定成功、不重渲染', () => {
    const svg = renderToSvgString(idIr);
    expect(svg).toContain('data-retikz-id="a"');

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = svg;
    const root = container.querySelector('svg');
    expect(root).not.toBeNull();

    const before = root!.outerHTML;
    const onClick = vi.fn();
    hydrate(root!, { handlers: { a: { click: onClick } } });
    // 水合不重渲染：DOM 结构不变
    expect(root!.outerHTML).toBe(before);

    const target = findById(root!, 'a');
    expect(target).not.toBeNull();
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);

    container.remove();
  });

  it('view.hydrate-context：handler 收到 (event, context) 富上下文（id / meta / geometry / element）', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSvg(container, metaIr);
    let context: HydrationContext | undefined;
    view.hydrate({ handlers: { a: { click: (_event, received) => { context = received; } } } });

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

  it('standalone-hydrate-scene：传 scene → 富 context；不传 → 最小 context（meta/geometry undefined、animation no-op、不抛）', () => {
    const svg = renderToSvgString(metaIr);
    const richContainer = document.createElement('div');
    document.body.appendChild(richContainer);
    richContainer.innerHTML = svg;
    const richRoot = richContainer.querySelector('svg')!;
    let richCtx: HydrationContext | undefined;
    hydrate(richRoot, { handlers: { a: { click: (_e, c) => { richCtx = c; } } }, scene: compileToScene(metaIr) });
    findById(richRoot, 'a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(richCtx?.meta).toEqual({ series: 'sales', i: 3 });
    expect(richCtx?.geometry).toBeDefined();

    const minContainer = document.createElement('div');
    document.body.appendChild(minContainer);
    minContainer.innerHTML = svg;
    const minRoot = minContainer.querySelector('svg')!;
    let minCtx: HydrationContext | undefined;
    hydrate(minRoot, { handlers: { a: { click: (_e, c) => { minCtx = c; } } } });
    findById(minRoot, 'a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(minCtx?.id).toBe('a');
    expect(minCtx?.meta).toBeUndefined();
    expect(minCtx?.geometry).toBeUndefined();
    expect(minCtx?.scene).toBeUndefined();
    expect(() => minCtx?.animation.play()).not.toThrow();

    richContainer.remove();
    minContainer.remove();
  });

  it('dispose-detaches：dispose 后点击不再触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountSvg(container, idIr);
    const onClick = vi.fn();
    const handle = hydrate(view.root, { handlers: { a: { click: onClick } } });
    handle.dispose();

    const target = findById(view.root, 'a');
    expect(target).not.toBeNull();
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();

    container.remove();
  });
});
