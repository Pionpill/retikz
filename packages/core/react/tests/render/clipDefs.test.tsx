import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { GroupPrim, SceneResource } from '@retikz/core';
import { renderPrim } from '../../src/render/renderPrim';
import { ClipDefs } from '../../src/render/clipDefs';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * ClipDefs 物化测试 + GroupPrim.clipRef 渲染
 * @description ClipResource 物化成 `<clipPath>` 内对应形状子元素（rect / circle / ellipse / polygon）；
 *   GroupPrim.clipRef 经 renderPrim group 分支物化成 `<g clip-path="url(#...)">`。
 *   仿 PaintDefs：直接调函数组件拿 ReactElement 检查 children。
 */

/** 调 ClipDefs 拿物化后的 clipPath 元素数组（过滤 falsy） */
const clipPathsOf = (resources: Array<SceneResource>): Array<AnyEl> => {
  const frag = ClipDefs({ resources, idFor: (id: string) => `c-${id}` }) as AnyEl;
  return (frag.props.children as Array<AnyEl>).filter(Boolean);
};

/** 取一个 clipPath 的子元素（形状几何） */
const shapeChildrenOf = (clipPath: AnyEl): Array<AnyEl> => {
  const c = clipPath.props.children;
  return (Array.isArray(c) ? c : [c]).filter(Boolean) as Array<AnyEl>;
};

/**
 * 构造一个 clip 资源（ClipResource）
 * @description shape 用 4 形状判别 union 的对象字面量；经 `as unknown as SceneResource`
 *   构造（资源表升 paint+clip 联合后此 cast 收紧为正常 ClipResource）。
 */
const clipResource = (id: string, shape: unknown): SceneResource =>
  ({ kind: 'clip', id, shape }) as unknown as SceneResource;

describe('ClipDefs — 裁剪区物化为 clipPath', () => {
  it('rect clip → <clipPath> 内含 <rect x y width height>', () => {
    const [cp] = clipPathsOf([clipResource('clip-1', { kind: 'rect', x: 0, y: 0, width: 40, height: 30 })]);
    expect(cp.type).toBe('clipPath');
    expect(cp.props.id).toBe('c-clip-1');
    const [shape] = shapeChildrenOf(cp);
    expect(shape.type).toBe('rect');
    expect(shape.props.x).toBe(0);
    expect(shape.props.y).toBe(0);
    expect(shape.props.width).toBe(40);
    expect(shape.props.height).toBe(30);
  });

  it('circle clip → <clipPath> 内含 <circle cx cy r>', () => {
    const [cp] = clipPathsOf([clipResource('clip-1', { kind: 'circle', cx: 5, cy: 7, r: 120 })]);
    expect(cp.type).toBe('clipPath');
    const [shape] = shapeChildrenOf(cp);
    expect(shape.type).toBe('circle');
    expect(shape.props.cx).toBe(5);
    expect(shape.props.cy).toBe(7);
    expect(shape.props.r).toBe(120);
  });

  it('ellipse clip → <clipPath> 内含 <ellipse cx cy rx ry>', () => {
    const [cp] = clipPathsOf([clipResource('clip-1', { kind: 'ellipse', cx: 0, cy: 0, rx: 30, ry: 20 })]);
    const [shape] = shapeChildrenOf(cp);
    expect(shape.type).toBe('ellipse');
    expect(shape.props.cx).toBe(0);
    expect(shape.props.cy).toBe(0);
    expect(shape.props.rx).toBe(30);
    expect(shape.props.ry).toBe(20);
  });

  it('polygon clip → <clipPath> 内含 <polygon points>（含各点坐标）', () => {
    const [cp] = clipPathsOf([
      clipResource('clip-1', {
        kind: 'polygon',
        points: [
          [0, 0],
          [40, 0],
          [20, 40],
        ],
      }),
    ]);
    const [shape] = shapeChildrenOf(cp);
    expect(shape.type).toBe('polygon');
    const points = String(shape.props.points);
    expect(points).toContain('0');
    expect(points).toContain('40');
    expect(points).toContain('20');
  });

  it('多 clip 资源 → 多个 clipPath，各自 id', () => {
    const cps = clipPathsOf([
      clipResource('clip-1', { kind: 'rect', x: 0, y: 0, width: 10, height: 10 }),
      clipResource('clip-2', { kind: 'circle', cx: 0, cy: 0, r: 5 }),
    ]);
    expect(cps).toHaveLength(2);
    expect(cps.map(cp => cp.props.id)).toEqual(['c-clip-1', 'c-clip-2']);
  });

  it('混入 paint 资源 → ClipDefs 只物化 clip 资源（按 kind 分流）', () => {
    const cps = clipPathsOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: {
          kind: 'linearGradient',
          stops: [
            { offset: 0, color: '#000' },
            { offset: 1, color: '#fff' },
          ],
        },
      },
      clipResource('clip-1', { kind: 'rect', x: 0, y: 0, width: 10, height: 10 }),
    ]);
    expect(cps).toHaveLength(1);
    expect(cps[0].type).toBe('clipPath');
    expect(cps[0].props.id).toBe('c-clip-1');
  });
});

describe('renderPrim — GroupPrim.clipRef → <g clip-path>', () => {
  const groupWithClip = (clipRef?: string): GroupPrim => ({
    type: 'group',
    clipRef,
    children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }],
  });

  it('clipRef 存在 → <g clip-path="url(#prefix-id)">（经 clipRefUrl）', () => {
    const el = renderPrim(groupWithClip('clip-1'), 0, {
      clipRefUrl: (id: string) => `url(#C-${id})`,
    }) as AnyEl;
    expect(el.type).toBe('g');
    expect(el.props['clipPath']).toBe('url(#C-clip-1)');
  });

  it('clipRef 缺省 clipRefUrl → url(#id)', () => {
    const el = renderPrim(groupWithClip('clip-2'), 0) as AnyEl;
    expect(el.props['clipPath']).toBe('url(#clip-2)');
  });

  it('无 clipRef 的 group → 不设 clip-path', () => {
    const el = renderPrim(groupWithClip(undefined), 0) as AnyEl;
    expect(el.props['clipPath']).toBeUndefined();
  });
});
