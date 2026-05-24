import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { RectPrim, SceneResource } from '@retikz/core';
import { renderPrim } from '../../src/render/renderPrim';
import { PaintDefs } from '../../src/render/paintDefs';

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
          type: 'linearGradient',
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
    expect((g.props.children as { props: { spec: unknown } }).props.spec).toBeDefined();
  });

  it('radialGradient：type / id / 缺省 center·r', () => {
    const [g] = childrenOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: {
          type: 'radialGradient',
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
});
