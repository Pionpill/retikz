import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { ArrowShape } from '@retikz/core';
import { ArrowMarker } from '../../src/render/arrowMarkers';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * ArrowMarker 是 FC——直接调函数拿 ReactElement 检查。
 * 关注点：marker 的几何契约（viewBox / refX / markerUnits / orient），不验证内部 path d 的具体字符串。
 */
const render = (shape: ArrowShape, id = 'mk') => ArrowMarker({ id, shape }) as unknown as AnyEl;

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
    });
  });

  it.each(ALL_SHAPES)('%s：children 是单个 React element（具体 path / circle）', shape => {
    const el = render(shape);
    expect(el.props.children).toBeDefined();
    // children 是单个 element，不是数组
    expect(Array.isArray(el.props.children)).toBe(false);
  });
});

describe('ArrowMarker: refX 分类——实心 vs 空心', () => {
  // 实心：apex 贴 path 端点 → refX=10
  it.each(['normal', 'stealth', 'diamond', 'circle'] as const)('%s 实心 refX=10', shape => {
    expect(render(shape).props.refX).toBe(10);
  });

  // 空心：背面贴 path 端点 → refX 在形状背面
  it('open 空心 refX=1', () => {
    expect(render('open').props.refX).toBe(1);
  });

  it('openDiamond 空心 refX=1', () => {
    expect(render('openDiamond').props.refX).toBe(1);
  });

  it('openCircle 空心 refX=0', () => {
    expect(render('openCircle').props.refX).toBe(0);
  });
});
