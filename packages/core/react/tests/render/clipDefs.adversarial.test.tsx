import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { GroupPrim, SceneResource } from '@retikz/core';
import { renderPrim } from '../../src/render/renderPrim';
import { ClipDefs } from '../../src/render/clipDefs';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * clip 物化对抗测试（破坏视角）
 * @description clipRef 指向不存在资源、ClipDefs 收纯 paint / 空表 / 混合资源、polygon points 序列化边界。
 *   主张：物化不抛、不串话、按 kind 严格分流。
 */

const clipPathsOf = (resources: Array<SceneResource>): Array<AnyEl> => {
  const frag = ClipDefs({ resources, idFor: (id: string) => `c-${id}` }) as AnyEl;
  return (frag.props.children as Array<AnyEl>).filter(Boolean);
};

const clipResource = (id: string, shape: unknown): SceneResource =>
  ({ kind: 'clip', id, shape }) as unknown as SceneResource;

describe('ClipDefs 对抗：非 clip / 空 / 混合资源', () => {
  it('资源表全是 paint → 物化 0 个 clipPath（严格按 kind 分流）', () => {
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
      } as unknown as SceneResource,
    ]);
    expect(cps).toHaveLength(0);
  });

  it('空资源表 → 物化 0 个 clipPath、不抛', () => {
    expect(clipPathsOf([])).toHaveLength(0);
  });

  it('paint / clip 交错多条 → 只物化 clip，顺序保持', () => {
    const cps = clipPathsOf([
      clipResource('clip-1', { kind: 'rect', x: 0, y: 0, width: 10, height: 10 }),
      {
        kind: 'paint',
        id: 'paint-1',
        spec: { kind: 'linearGradient', stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#fff' }] },
      } as unknown as SceneResource,
      clipResource('clip-2', { kind: 'circle', cx: 0, cy: 0, r: 5 }),
    ]);
    expect(cps).toHaveLength(2);
    expect(cps.map(cp => cp.props.id)).toEqual(['c-clip-1', 'c-clip-2']);
  });

  it('polygon points 含负坐标 → 序列化成 "x,y" 列表保留负号', () => {
    const [cp] = clipPathsOf([
      clipResource('clip-1', {
        kind: 'polygon',
        points: [[-5, -10], [40, 0], [20, 40]],
      }),
    ]);
    const shape = (Array.isArray(cp.props.children) ? cp.props.children[0] : cp.props.children) as AnyEl;
    const points = String(shape.props.points);
    expect(points).toContain('-5,-10');
    expect(points).toContain('40,0');
  });
});

describe('renderPrim group clipRef 对抗：指向不存在资源', () => {
  it('clipRef 指向 Scene 没有的资源 id → 仍产 url(#...) 引用（adapter 不校验存在性）', () => {
    const group: GroupPrim = {
      type: 'group',
      clipRef: 'clip-ghost',
      children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }],
    };
    const el = renderPrim(group, 0, { clipRefUrl: (id: string) => `url(#C-${id})` }) as AnyEl;
    // 渲染不抛；产 url 引用（即便资源不存在，SVG 会把 group 当作无可见内容裁掉——这是 SVG 语义，非 adapter bug）
    expect(el.type).toBe('g');
    expect(el.props['clipPath']).toBe('url(#C-clip-ghost)');
  });

  it('clipRef 为空字符串 → 仍走 clipRefUrl（空 id），不当作 undefined', () => {
    const group: GroupPrim = {
      type: 'group',
      clipRef: '',
      children: [],
    };
    const el = renderPrim(group, 0, { clipRefUrl: (id: string) => `url(#C-${id})` }) as AnyEl;
    // clipRef '' !== undefined，应物化（不被 `!== undefined` 守卫跳过）
    expect(el.props['clipPath']).toBe('url(#C-)');
  });

  it('嵌套 group 各带 clipRef → 各自物化 clip-path', () => {
    const inner: GroupPrim = {
      type: 'group',
      clipRef: 'clip-2',
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, fill: 'blue' }],
    };
    const outer: GroupPrim = {
      type: 'group',
      clipRef: 'clip-1',
      children: [inner],
    };
    const el = renderPrim(outer, 0, { clipRefUrl: (id: string) => `url(#${id})` }) as AnyEl;
    expect(el.props['clipPath']).toBe('url(#clip-1)');
    const innerEl = (el.props.children as Array<AnyEl>)[0];
    expect(innerEl.props['clipPath']).toBe('url(#clip-2)');
  });
});
