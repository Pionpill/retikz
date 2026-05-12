import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ArrowMarker } from '../../src/render/arrowMarkers';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * Adversarial test：攻击 ADR-03 决策细节在 render 层的实现
 * @description ArrowMarker 是 spec 的最终消费者；这里验证 silent ignore、scale × length 数学、context-stroke fallback、起末视觉互不串话
 */

describe('adv render 1: 空心 shape silent ignore fill（即便 spec 携带 fill 也不渲染红填充）', () => {
  it.each(['open', 'openDiamond', 'openCircle'] as const)(
    "%s spec.fill='red' → marker 内 inner.fill 仍 'none'（双保险：compile 已丢、render 也忽略）",
    shape => {
      const el = ArrowMarker({
        id: 'mk',
        // 即使 compile 没丢（防御性），render 层也不能让红色 fill 出现在 SVG
        spec: { shape, fill: 'red' },
      }) as AnyEl;
      const inner = el.props.children as AnyEl;
      expect(inner.props.fill).toBe('none');
    },
  );

  it("openDiamond + color='blue' + fill='red' → stroke='blue'、fill='none'（red 完全不进 SVG）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'openDiamond', color: 'blue', fill: 'red' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.stroke).toBe('blue');
    expect(inner.props.fill).toBe('none');
  });
});

describe('adv render 2: scale × length / width 算 markerWidth/Height（决策 §3）', () => {
  it("length=10 scale=1.5 → markerWidth = 15", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', length: 10, scale: 1.5 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(15);
  });

  it("scale=0.5 length=12 → markerWidth = 6（小数 scale 不四舍五入到 1）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', length: 12, scale: 0.5 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(6);
  });

  it("仅 length=10（无 scale）→ markerWidth = 10（scale 默认 1）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', length: 10 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(10);
  });

  it("仅 scale=3（无 length）→ markerWidth = 6 × 3 = 18", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', scale: 3 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(18);
  });

  it("length=0 scale=2 → markerWidth = 0（允许零 marker；nonneg schema 也允许）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', length: 0, scale: 2 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(0);
  });
});

describe('adv render 3: 缺省视觉字段 → context-stroke 兜底（不破坏既有行为）', () => {
  it("仅 shape='normal' → fill='context-stroke'（与 ADR-03 前完全一致）", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'normal' } }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('context-stroke');
  });

  it("仅 shape='open' → stroke='context-stroke' + fill='none' + strokeWidth=1.5", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'open' } }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.stroke).toBe('context-stroke');
    expect(inner.props.fill).toBe('none');
    expect(inner.props.strokeWidth).toBe(1.5);
  });

  it("opacity 缺省 → marker.opacity undefined（不写到 SVG 让继承 path 透明度）", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'normal' } }) as AnyEl;
    expect(el.props.opacity).toBeUndefined();
  });
});

describe('adv render 4: color / fill 互动（实心 shape 字段优先级）', () => {
  it("实心 normal + color='red' 无 fill → inner.fill='red'（color 作 fill 备用）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', color: 'red' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('red');
  });

  it("实心 normal + color='red' + fill='blue' → inner.fill='blue'（fill 主导）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', color: 'red', fill: 'blue' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('blue');
  });

  it("实心 normal + 仅 fill='blue'（无 color）→ inner.fill='blue'", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', fill: 'blue' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('blue');
  });
});

describe('adv render 5: lineWidth 仅空心 shape 生效', () => {
  it("空心 open + lineWidth=3 → inner.strokeWidth=3", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'open', lineWidth: 3 },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.strokeWidth).toBe(3);
  });

  it("实心 normal + lineWidth=3 → inner 无 stroke 属性（fill 形状无描边）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', lineWidth: 3 },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.strokeWidth).toBeUndefined();
    expect(inner.props.stroke).toBeUndefined();
  });
});

describe('adv render 6: opacity 落到 marker 元素层（不进 inner）', () => {
  it("opacity=0.5 → marker.opacity=0.5、inner 不受影响", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', opacity: 0.5, color: 'red' },
    }) as AnyEl;
    expect(el.props.opacity).toBe(0.5);
    const inner = el.props.children as AnyEl;
    // inner 仍按 color/fill 解析，不被 opacity 影响
    expect(inner.props.fill).toBe('red');
  });
});

describe('adv render 7: 同 marker 元素属性不被 spec 变更破坏', () => {
  it.each([
    { shape: 'normal', color: 'red', scale: 2 },
    { shape: 'open', color: 'blue', lineWidth: 4 },
    { shape: 'stealth', opacity: 0.5, fill: 'yellow' },
  ] as const)('spec=%j：viewBox / refY / orient / markerUnits 不变', spec => {
    const el = ArrowMarker({ id: 'mk', spec }) as AnyEl;
    expect(el.props).toMatchObject({
      viewBox: '0 0 10 10',
      refY: 5,
      orient: 'auto-start-reverse',
      markerUnits: 'strokeWidth',
    });
  });
});
