import type { PathPrimitive, RectPrimitive, SceneResource } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { SvgNode } from '../../../src/svg';
import { buildPrim } from '../../../src/svg';
import { renderPaintDefs } from './resource-fixtures';

const rect = (fill: RectPrimitive['fill']): RectPrimitive => ({
  type: 'rect',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  fill,
});

describe('buildPrim — PaintValue fill 分派', () => {
  it('纯色 string → fill attribute', () => {
    const el = buildPrim(rect('red'));

    expect(el.attrs.fill).toBe('red');
  });

  it('var() 纯色 → 走 inline style.fill、attribute 为 undefined', () => {
    const el = buildPrim(rect('var(--bg)'));

    expect(el.attrs.fill).toBeUndefined();
    expect((el.style as { fill?: string }).fill).toBe('var(--bg)');
  });

  it('resourceRef → fill="url(#prefix-id)"（经 paintRefUrl）', () => {
    const el = buildPrim(rect({ kind: 'resourceRef', id: 'paint-1' }), {
      paintRefUrl: id => `url(#X-${id})`,
    });

    expect(el.attrs.fill).toBe('url(#X-paint-1)');
  });

  it('contextStroke→填充="context-stroke"', () => {
    const el = buildPrim(rect({ kind: 'contextStroke' }));

    expect(el.attrs.fill).toBe('context-stroke');
  });

  it('resourceRef 缺省 paintRefUrl → url(#id)', () => {
    const el = buildPrim(rect({ kind: 'resourceRef', id: 'paint-2' }));

    expect(el.attrs.fill).toBe('url(#paint-2)');
  });
});

describe('buildPrim — PaintValue stroke 分派', () => {
  const path: PathPrimitive = {
    type: 'path',
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
    ],
    stroke: { kind: 'resourceRef', id: 'paint-1' },
  };

  it('resourceRef → stroke="url(#prefix-id)"（经 paintRefUrl）', () => {
    const el = buildPrim(path, {
      paintRefUrl: id => `url(#X-${id})`,
    });

    expect(el.attrs.stroke).toBe('url(#X-paint-1)');
  });

  it('var() 纯色 stroke → 走 inline style.stroke', () => {
    const el = buildPrim({ ...path, stroke: 'var(--outline)' });

    expect(el.attrs.stroke).toBeUndefined();
    expect((el.style as { stroke?: string }).stroke).toBe('var(--outline)');
  });
});

describe('renderPaintDefs — 渐变物化', () => {
  const childrenOf = (resources: Array<SceneResource>): Array<SvgNode> => {
    return renderPaintDefs({ resources, idFor: id => `g-${id}` });
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

    expect(g.tag).toBe('linearGradient');
    expect(g.attrs.id).toBe('g-paint-1');

    // angle 90 → 竖直：x1≈x2=0.5, y1=0→y2=1
    expect(g.attrs.x1).toBeCloseTo(0.5, 6);
    expect(g.attrs.x2).toBeCloseTo(0.5, 6);
    expect(g.attrs.y1).toBeCloseTo(0, 6);
    expect(g.attrs.y2).toBeCloseTo(1, 6);

    // stops 直接物化成 <stop> 子元素（不再经 <Stops> 包装组件）
    const stops = g.children as Array<SvgNode>;

    expect(stops).toHaveLength(2);
    expect(stops[0].tag).toBe('stop');
    expect(stops[0].attrs.offset).toBe(0);
    expect(stops[0].attrs['stop-color']).toBe('#4f8');
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

    expect(g.tag).toBe('radialGradient');
    expect(g.attrs.id).toBe('g-paint-1');
    expect(g.attrs.cx).toBe(0.5);
    expect(g.attrs.cy).toBe(0.5);
    expect(g.attrs.r).toBe(0.5);
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

    expect(p.tag).toBe('pattern');
    expect(p.attrs.patternUnits).toBe('userSpaceOnUse');
    expect(p.attrs.width).toBe(6);
    expect(p.attrs.height).toBe(6);
    expect(p.attrs.patternTransform).toBe('rotate(45)');

    // tile.motif 物化进 <pattern>（复用 arrow 的 renderMarkerPrim）：横线 path
    const motif = (p.children as Array<SvgNode>).filter(Boolean);

    expect(motif).toHaveLength(1);
    expect(motif[0].tag).toBe('path');
    expect(motif[0].attrs.stroke).toBe('currentColor');
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
    const motif = (p.children as Array<SvgNode>).filter(Boolean);

    expect(motif.map(m => m.tag)).toEqual(['rect', 'ellipse']);
  });

  it('image：<pattern> 套 <image>，fit cover → slice', () => {
    const [p] = childrenOf([{ kind: 'paint', id: 'paint-1', spec: { kind: 'image', href: 'a.png' } }]);

    expect(p.tag).toBe('pattern');

    const img = (p.children as Array<SvgNode>)[0];

    expect(img.tag).toBe('image');
    expect(img.attrs.href).toBe('a.png');
    expect(img.attrs.preserveAspectRatio).toBe('xMidYMid slice');
  });
});
