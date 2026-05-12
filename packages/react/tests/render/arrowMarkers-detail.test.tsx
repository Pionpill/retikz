import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ArrowMarker } from '../../src/render/arrowMarkers';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * ArrowMarker 接收 ArrowEndSpec（shape 必填 + 视觉字段全 optional）
 * @description 缺省视觉字段 → marker 仍走 `context-stroke` 维持向后兼容；显式字段 → override 硬编码
 */
describe('ArrowMarker：spec 视觉字段缺省 → context-stroke 兜底', () => {
  it("仅 shape='normal' 缺省视觉 → fill='context-stroke'", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'normal' } }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('context-stroke');
    expect(inner.props.stroke).toBeUndefined();
  });

  it("仅 shape='open' 缺省视觉 → stroke='context-stroke'，fill='none'", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'open' } }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('none');
    expect(inner.props.stroke).toBe('context-stroke');
  });
});

describe("ArrowMarker：color / fill 显式 override 硬编码", () => {
  it("实心 shape: color 显式 → stroke 是 color；fill 显式 → fill 是 fill", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', color: 'red', fill: 'yellow' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('yellow');
  });

  it("实心 shape: 仅 color 显式 → fill 也走 color（color 作 fill 备用）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', color: 'red' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('red');
  });

  it("空心 shape: color 显式 → stroke 是 color", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'open', color: 'red' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.stroke).toBe('red');
    expect(inner.props.fill).toBe('none');
  });

  it("空心 shape + fill='red'（silent no-op）→ inner fill 仍 'none'", () => {
    // 即便上层 compile 已把 fill 丢，本测试也确保 render 层即使收到 fill 仍忽略
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'open', fill: 'red' },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.fill).toBe('none');
  });

  it.each(['open', 'openDiamond', 'openCircle'] as const)(
    "空心 shape %s + fill='red' silent ignore",
    shape => {
      const el = ArrowMarker({ id: 'mk', spec: { shape, fill: 'red' } }) as AnyEl;
      const inner = el.props.children as AnyEl;
      expect(inner.props.fill).toBe('none');
    },
  );
});

describe("ArrowMarker：opacity 显式 override", () => {
  it("spec.opacity=0.5 → marker 元素 opacity=0.5", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', opacity: 0.5 },
    }) as AnyEl;
    expect(el.props.opacity).toBe(0.5);
  });

  it("spec.opacity 缺省 → marker 元素 opacity undefined（继承 path）", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'normal' } }) as AnyEl;
    expect(el.props.opacity).toBeUndefined();
  });
});

describe("ArrowMarker：scale × length / width 算 markerWidth / Height", () => {
  it("缺省 length / width → markerWidth=6 markerHeight=6（保持向后兼容）", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'normal' } }) as AnyEl;
    expect(el.props.markerWidth).toBe(6);
    expect(el.props.markerHeight).toBe(6);
  });

  it("length=10 scale=1.5 → markerWidth = 10 × 1.5 = 15（按 scale × length）", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', length: 10, scale: 1.5 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(15);
  });

  it("width=8 scale=2 → markerHeight = 8 × 2 = 16", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', width: 8, scale: 2 },
    }) as AnyEl;
    expect(el.props.markerHeight).toBe(16);
  });

  it("仅 scale 显式（length/width 缺省）→ markerWidth/Height = 6 × scale", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', scale: 2 },
    }) as AnyEl;
    expect(el.props.markerWidth).toBe(12);
    expect(el.props.markerHeight).toBe(12);
  });
});

describe("ArrowMarker：lineWidth（空心 shape 描边）", () => {
  it("空心 shape 缺省 lineWidth → strokeWidth=1.5（向后兼容）", () => {
    const el = ArrowMarker({ id: 'mk', spec: { shape: 'open' } }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.strokeWidth).toBe(1.5);
  });

  it("空心 shape 显式 lineWidth=3 → strokeWidth=3", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'open', lineWidth: 3 },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.strokeWidth).toBe(3);
  });

  it("实心 shape 上 lineWidth 字段没有 stroke 元素能挂（fill 主导）→ inner.strokeWidth undefined", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'normal', lineWidth: 3 },
    }) as AnyEl;
    const inner = el.props.children as AnyEl;
    expect(inner.props.strokeWidth).toBeUndefined();
  });
});

describe("ArrowMarker：共用约定不被 spec 改变", () => {
  it("viewBox / refY / markerUnits / orient 始终不变", () => {
    const el = ArrowMarker({
      id: 'mk',
      spec: { shape: 'stealth', color: 'red', scale: 3 },
    }) as AnyEl;
    expect(el.props).toMatchObject({
      viewBox: '0 0 10 10',
      refY: 5,
      orient: 'auto-start-reverse',
      markerUnits: 'strokeWidth',
    });
  });
});
