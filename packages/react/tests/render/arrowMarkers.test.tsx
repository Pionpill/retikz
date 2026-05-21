import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { ArrowShape } from '@retikz/core';
import { ArrowMarker } from '../../src/render/arrowMarkers';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * ArrowMarker 是 FC——直接调函数拿 ReactElement 检查。
 * 关注点：marker 的几何契约（viewBox / refX / markerUnits / orient），不验证内部 path d 的具体字符串。
 */
const render = (shape: ArrowShape, id = 'mk') =>
  ArrowMarker({ id, spec: { shape } }) as unknown as AnyEl;

const ALL_SHAPES: Array<ArrowShape> = [
  'normal',
  'open',
  'stealth',
  'diamond',
  'openDiamond',
  'circle',
  'openCircle',
];

describe('ArrowMarker: 共用约定', () => {
  it.each(ALL_SHAPES)('%s：viewBox / refY / markerUnits / orient / id 一致', shape => {
    const el = render(shape, `arrow-${shape}`);
    expect(el.type).toBe('marker');
    expect(el.props).toMatchObject({
      id: `arrow-${shape}`,
      viewBox: '0 0 10 10',
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
      markerUnits: 'strokeWidth',
      preserveAspectRatio: 'none',
    });
  });

  it.each(ALL_SHAPES)('%s：children 是单个 React element（具体 path / circle）', shape => {
    const el = render(shape);
    expect(el.props.children).toBeDefined();
    // children 是单个 element，不是数组
    expect(Array.isArray(el.props.children)).toBe(false);
  });
});

describe('ArrowMarker: refX——line 接在 shape back 接线点', () => {
  // 实心 normal/diamond/circle：back 外缘 viewBox x=0 → refX=0
  it.each(['normal', 'diamond', 'circle'] as const)('%s 实心 refX=0（back 外缘 x=0）', shape => {
    expect(render(shape).props.refX).toBe(0);
  });

  // 实心 stealth：V tip viewBox x=3，line 嵌进凹口 → refX=3
  it('stealth 实心 refX=3（V tip 凹口）', () => {
    expect(render('stealth').props.refX).toBe(3);
  });

  // 空心：path 端点接在 back stroke 外缘 → refX = back-centerline - lineWidth/2
  // 默认 lineWidth=1.5：open / openDiamond back centerline x=1 → refX=0.25
  // openCircle 圆外缘左 x = 0.75 - 0.75 = 0
  it('open 空心 refX=0.25（back centerline 1 - lineWidth/2）', () => {
    expect(render('open').props.refX).toBe(0.25);
  });

  it('openDiamond 空心 refX=0.25（同 open）', () => {
    expect(render('openDiamond').props.refX).toBe(0.25);
  });

  it('openCircle 空心 refX=0（圆外缘左 x=0.75 - lineWidth/2 = 0）', () => {
    expect(render('openCircle').props.refX).toBe(0);
  });
});
