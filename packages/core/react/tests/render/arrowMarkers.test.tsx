import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { ArrowEndSpec, MarkerPathCommand, MarkerPrimitive } from '@retikz/core';
import { ArrowMarker } from '../../src/render/arrowMarkers';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * ArrowMarker 物化测试（emit-in-compile 契约）
 * @description ArrowMarker 不再 switch shape / 算几何——只**物化**已解析的 `ArrowEndSpec`：
 *   wrapper 参数（viewBox `0 0 baseSize baseSize` / refX / refY=baseSize/2 / markerWidth / markerHeight）来自
 *   spec，内部元素来自 `spec.marker`（`MarkerPrimitive[]`，core 已产）。内置 7 的 d-string 回归改成：给定
 *   resolved marker 几何 → 物化的 path d 等价旧值。
 *   ArrowMarker 是 FC——直接调函数拿 ReactElement 检查。
 */

/** 构造一个已解析 ArrowEndSpec（wrapper 参数 + marker 几何） */
const spec = (overrides: Partial<ArrowEndSpec> = {}): ArrowEndSpec => ({
  shape: 'custom',
  baseSize: 10,
  refX: 0,
  markerWidth: 6,
  markerHeight: 6,
  marker: [],
  ...overrides,
});

const render = (s: ArrowEndSpec, id = 'mk'): AnyEl =>
  ArrowMarker({ id, spec: s }) as unknown as AnyEl;

/** 取物化 marker 的 children（数组形态） */
const innerEls = (el: AnyEl): Array<AnyEl> => {
  const c = el.props.children;
  return (Array.isArray(c) ? c : [c]).filter(Boolean) as Array<AnyEl>;
};

describe('ArrowMarker: wrapper 参数物化自 spec（不再 switch / 不算几何）', () => {
  it('viewBox / refY / markerUnits / orient / id 来自 spec', () => {
    const el = render(spec({ baseSize: 10, refX: 3, markerWidth: 6, markerHeight: 6 }), 'arrow-x');
    expect(el.type).toBe('marker');
    expect(el.props).toMatchObject({
      id: 'arrow-x',
      viewBox: '0 0 10 10',
      refX: 3,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
      markerUnits: 'strokeWidth',
      preserveAspectRatio: 'none',
    });
  });

  it('refX 直接取 spec.refX（hollow 已在 compile 减 lineWidth/2，react 不再算）', () => {
    expect(render(spec({ refX: 0.25 })).props.refX).toBe(0.25);
    expect(render(spec({ refX: 0 })).props.refX).toBe(0);
  });

  it('refY = baseSize/2（自定义 baseSize 也跟随）', () => {
    expect(render(spec({ baseSize: 20 })).props.refY).toBe(10);
    expect(render(spec({ baseSize: 20 })).props.viewBox).toBe('0 0 20 20');
  });

  it('markerWidth / markerHeight 直接取 spec（compile 已乘 scale）', () => {
    const el = render(spec({ markerWidth: 9, markerHeight: 12 }));
    expect(el.props.markerWidth).toBe(9);
    expect(el.props.markerHeight).toBe(12);
  });

  it('opacity 透传到 marker 元素层', () => {
    expect(render(spec({ opacity: 0.5 })).props.opacity).toBe(0.5);
  });
});

describe('ArrowMarker: marker 几何物化（spec.marker → SVG 元素）', () => {
  it('单 path marker → 物化出一个 <path>，d 等价 commands', () => {
    const marker: Array<MarkerPrimitive> = [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 5] },
          { kind: 'line', to: [0, 10] },
          { kind: 'close' },
        ],
        fill: 'crimson',
      },
    ];
    const el = render(spec({ marker }));
    const inner = innerEls(el);
    expect(inner).toHaveLength(1);
    expect(inner[0].type).toBe('path');
    expect((inner[0].props as Record<string, unknown>).d).toBe('M 0 0 L 10 5 L 0 10 Z');
    expect((inner[0].props as Record<string, unknown>).fill).toBe('crimson');
  });

  it('contextStroke fill → SVG context-stroke（主题反应不冻结）', () => {
    const marker: Array<MarkerPrimitive> = [
      { type: 'path', commands: [{ kind: 'move', to: [0, 0] }], fill: { kind: 'contextStroke' } },
    ];
    const inner = innerEls(render(spec({ marker })));
    expect((inner[0].props as Record<string, unknown>).fill).toBe('context-stroke');
  });

  it('ellipse marker → 物化出 <ellipse>，cx/cy/rx/ry 透传', () => {
    const marker: Array<MarkerPrimitive> = [
      { type: 'ellipse', cx: 5, cy: 5, rx: 5, ry: 5, fill: 'black' },
    ];
    const inner = innerEls(render(spec({ marker })));
    expect(inner[0].type).toBe('ellipse');
    expect(inner[0].props as Record<string, unknown>).toMatchObject({ cx: 5, cy: 5, rx: 5, ry: 5 });
  });

  it('group marker → 物化出 <g> 并递归子元素', () => {
    const marker: Array<MarkerPrimitive> = [
      {
        type: 'group',
        children: [
          { type: 'path', commands: [{ kind: 'move', to: [1, 1] }, { kind: 'line', to: [9, 5] }, { kind: 'close' }] },
        ],
      },
    ];
    const inner = innerEls(render(spec({ marker })));
    expect(inner[0].type).toBe('g');
    const groupChildren = (inner[0].props as { children?: unknown }).children as Array<AnyEl>;
    expect(groupChildren[0].type).toBe('path');
    expect((groupChildren[0].props as Record<string, unknown>).d).toBe('M 1 1 L 9 5 Z');
  });
});

/**
 * 内置 7 marker 的 d-string 回归（golden master）
 * @description 给定 resolved marker 几何（compile 产物的 commands / ellipse 参数）→ 物化的 path d / ellipse
 *   参数等价旧 switch。几何已在 compile，react 只翻成 SVG。
 */
describe('ArrowMarker: 内置 7 resolved 几何物化回归（golden master）', () => {
  const pathMarker = (commands: Array<MarkerPathCommand>): ArrowEndSpec =>
    spec({ marker: [{ type: 'path', commands }] });

  it('normal: 实心三角 d="M 0 0 L 10 5 L 0 10 Z"', () => {
    const inner = innerEls(render(pathMarker([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 5] },
      { kind: 'line', to: [0, 10] },
      { kind: 'close' },
    ])));
    expect((inner[0].props as Record<string, unknown>).d).toBe('M 0 0 L 10 5 L 0 10 Z');
  });

  it('stealth: V 形倒钩 d="M 0 0 L 10 5 L 0 10 L 3 5 Z"', () => {
    const inner = innerEls(render(pathMarker([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 5] },
      { kind: 'line', to: [0, 10] },
      { kind: 'line', to: [3, 5] },
      { kind: 'close' },
    ])));
    expect((inner[0].props as Record<string, unknown>).d).toBe('M 0 0 L 10 5 L 0 10 L 3 5 Z');
  });

  it('diamond: 实心菱形 d="M 0 5 L 5 0 L 10 5 L 5 10 Z"', () => {
    const inner = innerEls(render(pathMarker([
      { kind: 'move', to: [0, 5] },
      { kind: 'line', to: [5, 0] },
      { kind: 'line', to: [10, 5] },
      { kind: 'line', to: [5, 10] },
      { kind: 'close' },
    ])));
    expect((inner[0].props as Record<string, unknown>).d).toBe('M 0 5 L 5 0 L 10 5 L 5 10 Z');
  });

  it('open: 空心三角 d="M 1 1 L 9 5 L 1 9 Z"', () => {
    const inner = innerEls(render(pathMarker([
      { kind: 'move', to: [1, 1] },
      { kind: 'line', to: [9, 5] },
      { kind: 'line', to: [1, 9] },
      { kind: 'close' },
    ])));
    expect((inner[0].props as Record<string, unknown>).d).toBe('M 1 1 L 9 5 L 1 9 Z');
  });

  it('openDiamond: 空心菱形 d="M 1 5 L 5 1 L 9 5 L 5 9 Z"', () => {
    const inner = innerEls(render(pathMarker([
      { kind: 'move', to: [1, 5] },
      { kind: 'line', to: [5, 1] },
      { kind: 'line', to: [9, 5] },
      { kind: 'line', to: [5, 9] },
      { kind: 'close' },
    ])));
    expect((inner[0].props as Record<string, unknown>).d).toBe('M 1 5 L 5 1 L 9 5 L 5 9 Z');
  });

  it('circle: 实心圆 cx=5 cy=5 r=5（ellipse rx=ry=5）', () => {
    const inner = innerEls(render(spec({ marker: [{ type: 'ellipse', cx: 5, cy: 5, rx: 5, ry: 5 }] })));
    expect(inner[0].type).toBe('ellipse');
    expect(inner[0].props as Record<string, unknown>).toMatchObject({ cx: 5, cy: 5, rx: 5, ry: 5 });
  });

  it('openCircle: 空心圆 cx=5 cy=5 r=4.25', () => {
    const inner = innerEls(render(spec({ marker: [{ type: 'ellipse', cx: 5, cy: 5, rx: 4.25, ry: 4.25 }] })));
    expect(inner[0].props as Record<string, unknown>).toMatchObject({ cx: 5, cy: 5, rx: 4.25, ry: 4.25 });
  });
});
