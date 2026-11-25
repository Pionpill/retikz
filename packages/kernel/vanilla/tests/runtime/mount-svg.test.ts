// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import { renderToSvg } from '../../src';
import { mountSceneView } from '../../src/dom';
import { compileTestResult } from '../helpers/compilation';

/*
 * @retikz/vanilla mount（无框架浏览器 DOM，jsdom 环境）
 */
const sceneOf = (width = 20): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], shape: 'rectangle', layout: { minimumSize: { width, height: 20 } } },
  ],
});

describe('@retikz/vanilla mount', () => {
  it('卸载默认 session SVG 时仅移除当前宿主', () => {
    const container = document.createElement('div');
    const sibling = container.appendChild(document.createElement('span'));
    const view = mountSceneView(container, { type: 'scene', children: [] });
    expect(view.root.parentNode).toBe(container);
    view.dispose();
    expect(Array.from(container.children)).toEqual([sibling]);
  });

  it('宿主默认尺寸随取景框更新', () => {
    const ir: IRScene = {
      type: 'scene',
      version: 1,
      children: [],
      viewBox: { x: -20, y: -10, width: 240, height: 120 },
    };
    const container = document.createElement('div');
    const next: IRScene = { ...ir, viewBox: { x: 0, y: 0, width: 300, height: 100 } };
    const view = mountSceneView(container, ir);

    expect(view.root.getAttribute('width')).toBe('240');
    expect(view.root.getAttribute('height')).toBe('120');

    view.replace(next);

    expect(view.root.getAttribute('width')).toBe('300');
    expect(view.root.getAttribute('height')).toBe('100');

    view.dispose();
  });

  it('mount-svg-builds-dom：把 scene 挂成真实 <svg> DOM', () => {
    const c = document.createElement('div');
    const view = mountSceneView(c, sceneOf());
    const svg = c.querySelector('svg');

    expect(svg).toBeInstanceOf(SVGSVGElement);
    expect(view.root).toBe(svg);
    expect(svg!.querySelector('text, rect, g')).not.toBeNull();
  });

  it('view-update-reuses-root：update 复用同一 root 元素、attrs 更新、不多挂', () => {
    const c = document.createElement('div');
    const view = mountSceneView(c, sceneOf());
    const r1 = view.root;
    const vb1 = r1.getAttribute('viewBox');
    view.replace(sceneOf(100));

    expect(view.root).toBe(r1); // 元素恒等、未被替换
    expect(c.querySelectorAll('svg').length).toBe(1); // 没多挂一个
    expect(view.root.getAttribute('viewBox')).not.toBe(vb1); // root attrs 已更新
  });

  it('view artifacts 与 update 的 Scene 原子切换', () => {
    const marker = defineComposite({
      namespace: 'test',
      type: 'marker',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('marker'), label: string() }),
      artifactSchema: string(),
      compile: input => ({ children: [{ type: 'node', id: input.label, position: [0, 0] }], artifact: input.label }),
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'test', type: 'marker', label: 'first' }],
    };
    const c = document.createElement('div');
    const view = mountSceneView(c, ir, { compile: { composites: [marker] } });
    expect(view.compileResult.artifacts).toMatchObject([{ namespace: 'test', type: 'marker', value: 'first' }]);
    expect(view.root.querySelector('[data-retikz-id="first"]')).not.toBeNull();
    view.replace({ version: 1, type: 'scene', children: [{ namespace: 'test', type: 'marker', label: 'second' }] });
    expect(view.compileResult.artifacts).toMatchObject([{ namespace: 'test', type: 'marker', value: 'second' }]);
    expect(view.root.querySelector('[data-retikz-id="first"]')).toBeNull();
    expect(view.root.querySelector('[data-retikz-id="second"]')).not.toBeNull();
    view.dispose();
  });

  it('idprefix-ssr-mount-parity：同 idPrefix 下 SSR 串与 DOM 的资源 id 一致', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'a',
          position: [0, 0],
          shape: 'rectangle',
          style: {
            fill: {
              kind: 'linearGradient',
              stops: [
                { offset: 0, color: '#f00' },
                { offset: 1, color: '#00f' },
              ],
            },
          },
          layout: { minimumSize: { width: 40, height: 20 } },
        },
      ],
    };
    const scene = compileTestResult(ir).scene;
    const str = renderToSvg(scene, { output: { idPrefix: 'fig' } });
    const c = document.createElement('div');
    mountSceneView(c, ir, { output: { idPrefix: 'fig' } });
    const domHtml = c.querySelector('svg')!.outerHTML;

    expect(str).toContain('retikz-paint-fig-');
    expect(domHtml).toContain('retikz-paint-fig-');
  });

  it('dispose-clears：dispose 后容器清空、再调不抛', () => {
    const c = document.createElement('div');
    const view = mountSceneView(c, sceneOf());

    expect(c.querySelector('svg')).not.toBeNull();

    view.dispose();

    expect(c.querySelector('svg')).toBeNull();
    expect(() => view.dispose()).not.toThrow();
  });

  it('empty-scene-mounts：空 scene 挂出空 <svg>、不抛', () => {
    const c = document.createElement('div');
    const empty: IRScene = { version: 1, type: 'scene', children: [] };

    expect(() => mountSceneView(c, empty)).not.toThrow();
    expect(c.querySelector('svg')).not.toBeNull();
  });
});
