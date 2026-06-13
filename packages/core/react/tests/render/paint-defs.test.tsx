import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { RectPrim, SceneResource } from '@retikz/core';
import { renderPrim } from '../../src/render/render-prim';
import { PaintDefs } from '../../src/render/paint-defs';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

const rect = (fill: RectPrim['fill']): RectPrim => ({ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill });

describe('renderPrim — PaintValue fill 分派', () => {
  it('纯色 string → fill attribute', () => {
    const el = renderPrim(rect('red'), 0) as AnyEl;
    expect(el.props.fill).toBe('red');
  });

  it('var() 纯色 → 走 inline style.fill、attribute 为 undefined', () => {
    const el = renderPrim(rect('var(--bg)'), 0) as AnyEl;
    expect(el.props.fill).toBeUndefined();
    expect((el.props.style as { fill?: string }).fill).toBe('var(--bg)');
  });

  it('resourceRef → fill="url(#prefix-id)"（经 paintRefUrl）', () => {
    const el = renderPrim(rect({ kind: 'resourceRef', id: 'paint-1' }), 0, {
      paintRefUrl: id => `url(#X-${id})`,
    }) as AnyEl;
    expect(el.props.fill).toBe('url(#X-paint-1)');
  });

  it('contextStroke → fill="context-stroke"', () => {
    const el = renderPrim(rect({ kind: 'contextStroke' }), 0) as AnyEl;
    expect(el.props.fill).toBe('context-stroke');
  });

  it('resourceRef 缺省 paintRefUrl → url(#id)', () => {
    const el = renderPrim(rect({ kind: 'resourceRef', id: 'paint-2' }), 0) as AnyEl;
    expect(el.props.fill).toBe('url(#paint-2)');
  });
});

describe('PaintDefs — 渐变物化', () => {
  const childrenOf = (resources: Array<SceneResource>): Array<AnyEl> => {
    const frag = PaintDefs({ resources, idFor: id => `g-${id}` }) as AnyEl;
    return (frag.props.children as Array<AnyEl>).filter(Boolean);
  };

  it('linearGradient：type / id / x1x2（angle 90 = 竖直）/ stops', () => {
    const [g] = childrenOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: {
          kind: 'linearGradient',
          angle: 90,
          stops: [
            { offset: 0, color: '#4f8' },
            { offset: 1, color: '#08f' },
          ],
        },
      },
    ]);
    expect(g.type).toBe('linearGradient');
    expect(g.props.id).toBe('g-paint-1');
    // angle 90 → 竖直：x1≈x2=0.5, y1=0→y2=1
    expect(g.props.x1).toBeCloseTo(0.5, 6);
    expect(g.props.x2).toBeCloseTo(0.5, 6);
    expect(g.props.y1).toBeCloseTo(0, 6);
    expect(g.props.y2).toBeCloseTo(1, 6);
    // stops 直接物化成 <stop> 子元素（不再经 <Stops> 包装组件）
    const stops = g.props.children as Array<AnyEl>;
    expect(stops).toHaveLength(2);
    expect(stops[0].type).toBe('stop');
    expect(stops[0].props.offset).toBe(0);
    expect(stops[0].props.stopColor).toBe('#4f8');
  });

  it('radialGradient：type / id / 缺省 center·r', () => {
    const [g] = childrenOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: {
          kind: 'radialGradient',
          stops: [
            { offset: 0, color: 'white' },
            { offset: 1, color: 'navy' },
          ],
        },
      },
    ]);
    expect(g.type).toBe('radialGradient');
    expect(g.props.id).toBe('g-paint-1');
    expect(g.props.cx).toBe(0.5);
    expect(g.props.cy).toBe(0.5);
    expect(g.props.r).toBe(0.5);
  });

  it('pattern：<pattern> userSpaceOnUse + tile size + 旋转（物化已解析 tile）', () => {
    const [p] = childrenOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: { kind: 'pattern', shape: 'lines', size: 6, rotation: 45 },
        tile: {
          size: 6,
          rotation: 45,
          motif: [
            {
              type: 'path',
              commands: [
                { kind: 'move', to: [0, 0] },
                { kind: 'line', to: [6, 0] },
              ],
              stroke: 'currentColor',
              strokeWidth: 1,
            },
          ],
        },
      },
    ]);
    expect(p.type).toBe('pattern');
    expect(p.props.patternUnits).toBe('userSpaceOnUse');
    expect(p.props.width).toBe(6);
    expect(p.props.height).toBe(6);
    expect(p.props.patternTransform).toBe('rotate(45)');
    // tile.motif 物化进 <pattern>（复用 arrow 的 renderMarkerPrim）：横线 path
    const motif = (p.props.children as Array<AnyEl>).filter(Boolean);
    expect(motif).toHaveLength(1);
    expect(motif[0].type).toBe('path');
    expect(motif[0].props.stroke).toBe('currentColor');
  });

  it('pattern：tile.motif 含背景 rect + dots ellipse 都物化', () => {
    const [p] = childrenOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: { kind: 'pattern', shape: 'dots', background: '#eee' },
        tile: {
          size: 8,
          background: '#eee',
          motif: [
            { type: 'rect', x: 0, y: 0, width: 8, height: 8, fill: '#eee' },
            { type: 'ellipse', cx: 4, cy: 4, rx: 1.6, ry: 1.6, fill: 'currentColor' },
          ],
        },
      },
    ]);
    const motif = (p.props.children as Array<AnyEl>).filter(Boolean);
    expect(motif.map(m => m.type)).toEqual(['rect', 'ellipse']);
  });

  it('image：<pattern> 套 <image>，fit cover → slice', () => {
    const [p] = childrenOf([
      { kind: 'paint', id: 'paint-1', spec: { kind: 'image', href: 'a.png' } },
    ]);
    expect(p.type).toBe('pattern');
    const img = (p.props.children as Array<AnyEl>)[0];
    expect(img.type).toBe('image');
    expect(img.props.href).toBe('a.png');
    expect(img.props.preserveAspectRatio).toBe('xMidYMid slice');
  });
});
