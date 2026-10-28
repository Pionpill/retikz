import type { PathPrimitive, RectPrimitive, CompiledArrowEnd, Scene, SceneResource } from '@retikz/core';
import type { SvgNode } from '@retikz/render/svg';
import { describe, expect, it } from 'vitest';

import { buildSvgDocument } from '../../../src/svg/builders/document';
import { renderToSvgString } from '../../../src/svg/serialize/to-string';

const layout = { x: 0, y: 0, width: 10, height: 10 };

const arrowSpec: CompiledArrowEnd = {
  shape: 'stealth',
  baseSize: 10,
  refX: 8,
  markerWidth: 6,
  markerHeight: 6,
  marker: [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 5] },
        { kind: 'line', to: [0, 10] },
        { kind: 'close' },
      ],
      fill: { kind: 'contextStroke' },
    },
  ],
};

/** doc.children 里第一个指定 tag 的 SvgNode */
const childByTag = (doc: SvgNode, tag: string): SvgNode | undefined =>
  (doc.children ?? []).find((c): c is SvgNode => typeof c !== 'string' && c.tag === tag);

describe('buildSvgDocument —— 边界', () => {
  it('默认字体进入 SVG 根属性和字符串输出，省略时不强制字体', () => {
    const scene: Scene = { primitives: [], layout };
    expect(buildSvgDocument(scene, { idPrefix: 'font', defaultFontFamily: 'serif' }).attrs['font-family']).toBe(
      'serif',
    );
    expect(renderToSvgString(scene, { idPrefix: 'font', defaultFontFamily: 'serif' })).toContain('font-family="serif"');
    expect(buildSvgDocument(scene, { idPrefix: 'font' }).attrs).not.toHaveProperty('font-family');
  });
  it('empty-scene：无 primitive / 无 resource → <svg> 不含 <defs>', () => {
    const scene: Scene = { primitives: [], layout };
    const doc = buildSvgDocument(scene, { idPrefix: 'd1' });

    expect(doc.tag).toBe('svg');
    expect(doc.attrs.viewBox).toBe('0 0 10 10');
    expect(childByTag(doc, 'defs')).toBeUndefined();
  });
});

describe('buildSvgDocument —— 交互', () => {
  it('将箭头两端放置在所属路径容器中', () => {
    const path: PathPrimitive = {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      stroke: '#000',
      arrowStart: arrowSpec,
      arrowEnd: arrowSpec,
    };
    const scene: Scene = { primitives: [path], layout };
    const doc = buildSvgDocument(scene, { idPrefix: 'd1' });
    const group = childByTag(doc, 'g');
    const children = group?.children?.filter((child): child is SvgNode => typeof child !== 'string');
    expect(children).toHaveLength(3);
    expect(children?.[0].tag).toBe('path');
    expect(children?.[1].attrs.transform).toContain('translate(0 0) rotate(180)');
    expect(children?.[2].attrs.transform).toContain('translate(10 0) rotate(0)');
  });

  it('idprefix-determinism：同 scene + 同 idPrefix 逐字一致；不同 idPrefix → 资源 id 无交集', () => {
    const gradient: SceneResource = {
      kind: 'paint',
      id: 'paint-1',
      spec: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: '#000' },
          { offset: 1, color: '#fff' },
        ],
      },
    };
    const rect: RectPrimitive = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      fill: { kind: 'resourceRef', id: 'paint-1' },
    };
    const scene: Scene = { primitives: [rect], layout, resources: [gradient] };

    const a1 = renderToSvgString(scene, { idPrefix: 'a' });
    const a2 = renderToSvgString(scene, { idPrefix: 'a' });

    expect(a1).toBe(a2); // 确定性

    const b1 = renderToSvgString(scene, { idPrefix: 'b' });

    expect(a1).not.toBe(b1); // 不同前缀产不同 id
    expect(a1).toContain('id="retikz-paint-a-paint-1"');
    expect(a1).toContain('url(#retikz-paint-a-paint-1)');
    expect(b1).toContain('id="retikz-paint-b-paint-1"');
    expect(a1).not.toContain('retikz-paint-b-');
    expect(b1).not.toContain('retikz-paint-a-');
  });

  it('不安全的 idPrefix 在发出资源 ID 和 url 片段之前已标准化', () => {
    const gradient: SceneResource = {
      kind: 'paint',
      id: 'paint-1',
      spec: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: '#000' },
          { offset: 1, color: '#fff' },
        ],
      },
    };
    const rect: RectPrimitive = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      fill: { kind: 'resourceRef', id: 'paint-1' },
    };
    const unsafePrefix = 'bad prefix:foo.bar)';
    const out = renderToSvgString({ primitives: [rect], layout, resources: [gradient] }, { idPrefix: unsafePrefix });
    const id = out.match(/id="(retikz-paint-[^"]+)"/)?.[1];

    expect(id).toBeDefined();
    expect(id).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
    expect(out).toContain(`url(#${id})`);
    expect(out).not.toContain(unsafePrefix);
  });
});

describe('renderToSvgString —— 尺寸注入', () => {
  const sized = (): Scene => ({ primitives: [], layout });

  it('给定 width/height → 根 <svg> 写入显示尺寸属性', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's', width: 320, height: 240 });

    expect(out).toMatch(/^<svg\b/);
    expect(out).toContain('width="320"');
    expect(out).toContain('height="240"');
  });

  it('只给 width → 按内容比例推导 height', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's', width: 320 });

    expect(out).toContain('width="320"');
    expect(out).toContain('height="320"');
  });

  it('缺省 width/height → 使用 scene.layout 的固有尺寸', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's' });

    expect(out).toContain('width="10"');
    expect(out).toContain('height="10"');
    expect(out).toContain('viewBox="0 0 10 10"');
  });

  it('viewBox 始终源自 scene.layout，不被显示尺寸覆盖', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's', width: 999, height: 888 });

    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('width="999"');
    expect(out).toContain('height="888"');
  });
});
