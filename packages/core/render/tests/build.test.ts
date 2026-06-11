import { describe, expect, it } from 'vitest';
import type {
  GroupPrim,
  MarkerPrimitive,
  PaintResource,
  RectPrim,
  ScenePrimitive,
  TextPrim,
} from '@retikz/core';
import { buildPrim } from '../src/svg/builders/prim';
import { buildMarkerPrim } from '../src/svg/builders/markerPrim';
import { buildPaintDef } from '../src/svg/builders/paintDefs';
import { collectArrowSpecs } from '../src/svg/builders/arrowCollect';

describe('buildPrim —— primitive → SvgNode', () => {
  it('prim-rect-to-node：rect → tag/kebab/SVG 真名属性，无 React camelCase', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 1,
      y: 2,
      width: 10,
      height: 20,
      cornerRadius: 3,
      fill: '#f00',
      strokeWidth: 2,
    };
    const node = buildPrim(rect);
    expect(node.tag).toBe('rect');
    expect(node.attrs['stroke-width']).toBe(2);
    expect(node.attrs.rx).toBe(3);
    expect(node.attrs.ry).toBe(3);
    expect(node.attrs.fill).toBe('#f00');
    // React camelCase 不得泄漏进中性描述树
    expect('strokeWidth' in node.attrs).toBe(false);
    expect(node.style).toBeUndefined();
  });

  it('prim-text-multiline：3 行 + baseline middle → 3 个 tspan，首行 dy = -(n-1)/2 × lineHeight', () => {
    const text: TextPrim = {
      type: 'text',
      x: 0,
      y: 0,
      lines: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
      fontSize: 12,
      align: 'middle',
      baseline: 'middle',
      lineHeight: 10,
      measuredWidth: 6,
      measuredHeight: 30,
    };
    const node = buildPrim(text);
    expect(node.tag).toBe('text');
    expect(node.attrs['text-anchor']).toBe('middle');
    expect(node.attrs['dominant-baseline']).toBe('central');
    expect(node.children).toHaveLength(3);
    const [t0, t1, t2] = node.children as Array<{ tag: string; attrs: { dy: number }; children: Array<string> }>;
    expect(t0.tag).toBe('tspan');
    expect(t0.attrs.dy).toBe(-10); // -(3-1)/2 × 10
    expect(t1.attrs.dy).toBe(10);
    expect(t2.attrs.dy).toBe(10);
    expect(t0.children[0]).toBe('a');
  });

  it('prim-group-transform-clip：group → g + transform + clip-path（url 经 clipRefUrl）', () => {
    const group: GroupPrim = {
      type: 'group',
      transforms: [{ kind: 'translate', x: 5, y: 6 }],
      clipRef: 'c1',
      children: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1 }],
    };
    const node = buildPrim(group, { clipRefUrl: id => `url(#cp-${id})` });
    expect(node.tag).toBe('g');
    expect(node.attrs.transform).toBe('translate(5 6)');
    expect(node.attrs['clip-path']).toBe('url(#cp-c1)');
    expect(node.children).toHaveLength(1);
    expect((node.children as Array<{ tag: string }>)[0].tag).toBe('rect');
  });

  it('paint-var-to-style：fill = var(--brand) → 落 style.fill、不落 attrs.fill', () => {
    const rect: RectPrim = { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'var(--brand)' };
    const node = buildPrim(rect);
    expect(node.attrs.fill).toBeUndefined();
    expect(node.style?.fill).toBe('var(--brand)');
  });

  it('group-undefined-child：group.children 含 undefined 槽位 → builder noop 跳过、不抛', () => {
    const group: GroupPrim = {
      type: 'group',
      children: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
        undefined as unknown as ScenePrimitive,
      ],
    };
    expect(() => buildPrim(group)).not.toThrow();
    const node = buildPrim(group);
    expect(node.children).toHaveLength(1);
  });
});

describe('buildMarkerPrim —— marker primitive → SvgNode', () => {
  it('marker-group-transform：group.transforms 应落到 SVG g.transform', () => {
    const group: MarkerPrimitive = {
      type: 'group',
      transforms: [
        { kind: 'translate', x: 2, y: 3 },
        { kind: 'rotate', degrees: 45 },
      ],
      children: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [1, 0] },
          ],
        },
      ],
    };
    const node = buildMarkerPrim(group);
    expect(node.tag).toBe('g');
    expect(node.attrs.transform).toBe('translate(2 3) rotate(45)');
    expect(node.children).toHaveLength(1);
    expect((node.children as Array<{ tag: string }>)[0].tag).toBe('path');
  });
});

describe('buildPaintDef —— 错误路径兜底', () => {
  it('pattern-missing-tile：pattern 资源缺 tile（compile bug）→ 产空 <pattern id>、不抛', () => {
    const resource: PaintResource = {
      kind: 'paint',
      id: 'p1',
      spec: { kind: 'pattern', shape: 'dots' },
    };
    expect(() => buildPaintDef(resource, 'rid')).not.toThrow();
    const node = buildPaintDef(resource, 'rid');
    expect(node.tag).toBe('pattern');
    expect(node.attrs.id).toBe('rid');
    expect(node.children ?? []).toHaveLength(0);
  });
});

describe('collectArrowSpecs —— 防御', () => {
  it('group-undefined-child：嵌套 group 含 undefined 槽位 → 跳过、不抛', () => {
    const prims: Array<ScenePrimitive> = [
      {
        type: 'group',
        children: [undefined as unknown as ScenePrimitive],
      },
    ];
    expect(() => collectArrowSpecs(prims)).not.toThrow();
    expect(collectArrowSpecs(prims)).toEqual([]);
  });
});
