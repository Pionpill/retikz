// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { compileToScene } from '@retikz/core';
import type { IR, Scene } from '@retikz/core';
import { mountSvg, renderToSvgString } from '../src';

/**
 * @retikz/vanilla mountSvg（无框架浏览器 DOM，jsdom 环境）
 */
const sceneOf = (text = 'A'): ReturnType<typeof compileToScene> => {
  const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'a', position: [0, 0], text }] };
  return compileToScene(ir);
};

describe('@retikz/vanilla mountSvg', () => {
  it('mount-svg-builds-dom：把 scene 挂成真实 <svg> DOM', () => {
    const c = document.createElement('div');
    const view = mountSvg(c, sceneOf());
    const svg = c.querySelector('svg');
    expect(svg).toBeInstanceOf(SVGSVGElement);
    expect(view.root).toBe(svg);
    expect(svg!.querySelector('text, rect, g')).not.toBeNull();
  });

  it('view-update-reuses-root：update 复用同一 root 元素、attrs 更新、不多挂', () => {
    const c = document.createElement('div');
    const view = mountSvg(c, sceneOf('A'));
    const r1 = view.root;
    const vb1 = r1.getAttribute('viewBox');
    view.update(sceneOf('AAAAAAAAAAAAAAA')); // 更宽文本 → viewBox 变
    expect(view.root).toBe(r1); // 元素恒等、未被替换
    expect(c.querySelectorAll('svg').length).toBe(1); // 没多挂一个
    expect(view.root.getAttribute('viewBox')).not.toBe(vb1); // root attrs 已更新
  });

  it('idprefix-ssr-mount-parity：同 idPrefix 下 SSR 串与 DOM 的资源 id 一致', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'a',
          position: [0, 0],
          shape: 'rectangle',
          minimumWidth: 40,
          minimumHeight: 20,
          fill: { kind: 'linearGradient', stops: [{ offset: 0, color: '#f00' }, { offset: 1, color: '#00f' }] },
        },
      ],
    };
    const scene = compileToScene(ir);
    const str = renderToSvgString(scene, { idPrefix: 'fig' });
    const c = document.createElement('div');
    mountSvg(c, scene, { idPrefix: 'fig' });
    const domHtml = c.querySelector('svg')!.outerHTML;
    expect(str).toContain('retikz-paint-fig-');
    expect(domHtml).toContain('retikz-paint-fig-');
  });

  it('mount-null-container：非 Element 容器 → 可诊断 throw', () => {
    expect(() => mountSvg(null as never, sceneOf())).toThrow(/container/i);
  });

  it('dispose-clears：dispose 后容器清空、再调不抛', () => {
    const c = document.createElement('div');
    const view = mountSvg(c, sceneOf());
    expect(c.querySelector('svg')).not.toBeNull();
    view.dispose();
    expect(c.querySelector('svg')).toBeNull();
    expect(() => view.dispose()).not.toThrow();
  });

  it('empty-scene-mounts：空 scene 挂出空 <svg>、不抛', () => {
    const c = document.createElement('div');
    const empty: Scene = { layout: { x: 0, y: 0, width: 10, height: 10 }, primitives: [] };
    expect(() => mountSvg(c, empty)).not.toThrow();
    expect(c.querySelector('svg')).not.toBeNull();
  });
});
