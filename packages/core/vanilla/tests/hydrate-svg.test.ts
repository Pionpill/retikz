// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { IR } from '@retikz/core';
import { hydrate, mountSvg, renderToSvgString } from '../src';

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
