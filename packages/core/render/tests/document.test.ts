import type { ArrowEndSpec, PathPrim, RectPrim, Scene, SceneResource } from '@retikz/core';
import type { SvgNode } from '@retikz/render/svg';
import { describe, expect, it } from 'vitest';
import { buildSvgDocument } from '../src/svg/builders/document';
import { renderToSvgString } from '../src/svg/serialize/to-string';

const layout = { x: 0, y: 0, width: 10, height: 10 };

const arrowSpec: ArrowEndSpec = {
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
  it('empty-scene：无 primitive / 无 resource → <svg> 不含 <defs>', () => {
    const scene: Scene = { primitives: [], layout };
    const doc = buildSvgDocument(scene, { idPrefix: 'd1' });
    expect(doc.tag).toBe('svg');
    expect(doc.attrs.viewBox).toBe('0 0 10 10');
    expect(childByTag(doc, 'defs')).toBeUndefined();
  });
});

describe('buildSvgDocument —— 交互', () => {
  it('arrow-start-end-dedup：两端 spec 相同 → marker 去重成 1 个，marker-start / marker-end 引同 id', () => {
    const path: PathPrim = {
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
    const defs = childByTag(doc, 'defs');
    expect(defs).toBeDefined();
    const markers = (defs?.children ?? []).filter(
      (c): c is SvgNode => typeof c !== 'string' && c.tag === 'marker',
    );
    expect(markers).toHaveLength(1);
    const markerId = markers[0].attrs.id;
    const pathNode = (doc.children ?? []).find(
      (c): c is SvgNode => typeof c !== 'string' && c.tag === 'path',
    );
    expect(pathNode?.attrs['marker-start']).toBe(`url(#${markerId})`);
    expect(pathNode?.attrs['marker-end']).toBe(`url(#${markerId})`);
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
    const rect: RectPrim = {
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
});

describe('renderToSvgString —— 尺寸注入', () => {
  const sized = (): Scene => ({ primitives: [], layout });

  it('给定 width/height → 根 <svg> 写入显示尺寸属性', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's', width: 320, height: 240 });
    expect(out).toMatch(/^<svg\b/);
    expect(out).toContain('width="320"');
    expect(out).toContain('height="240"');
  });

  it('只给 width → 仅注入 width，不注入 height 属性', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's', width: 320 });
    expect(out).toContain('width="320"');
    expect(out).not.toMatch(/\bheight="/);
  });

  it('缺省 width/height → 不写显示尺寸属性，viewBox 仍由 scene.layout 决定', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's' });
    expect(out).not.toMatch(/\bwidth="/);
    expect(out).not.toMatch(/\bheight="/);
    expect(out).toContain('viewBox="0 0 10 10"');
  });

  it('viewBox 始终源自 scene.layout，不被显示尺寸覆盖', () => {
    const out = renderToSvgString(sized(), { idPrefix: 's', width: 999, height: 888 });
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('width="999"');
    expect(out).toContain('height="888"');
  });
});
