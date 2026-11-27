import type { GroupPrimitive, SceneClipPath, SceneResource } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { SvgNode } from '../../../src/svg';
import { buildPrim } from '../../../src/svg';
import { renderClipDefs } from './resource-fixtures';

/**
 * clip 物化对抗测试（破坏视角）
 * @description clipRef 指向不存在资源、renderClipDefs 收纯 paint / 空表 / 混合资源、polygon points 序列化边界。
 *   主张：物化不抛、不串话、按 kind 严格分流
 */

const clipPathsOf = (resources: Array<SceneResource>): Array<SvgNode> => {
  return renderClipDefs({ resources, idFor: (id: string) => `c-${id}` });
};

const clipResource = (id: string, path: SceneClipPath): SceneResource => ({ kind: 'clip', id, path });

const rectPath = (size: number): SceneClipPath => ({
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [size, 0] },
    { kind: 'line', to: [size, size] },
    { kind: 'line', to: [0, size] },
    { kind: 'close' },
  ],
  fillRule: 'nonzero',
});

describe('renderClipDefs 对抗：非 clip / 空 / 混合资源', () => {
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
      clipResource('clip-1', rectPath(10)),
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
      clipResource('clip-2', rectPath(5)),
    ]);

    expect(cps).toHaveLength(2);
    expect(cps.map(cp => cp.attrs.id)).toEqual(['c-clip-1', 'c-clip-2']);
  });

  it('canonical commands 含负坐标时 path d 保留负号', () => {
    const [cp] = clipPathsOf([
      clipResource('clip-1', {
        commands: [
          { kind: 'move', to: [-5, -10] },
          { kind: 'line', to: [40, 0] },
          { kind: 'line', to: [20, 40] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      }),
    ]);
    const shape = (Array.isArray(cp.children) ? cp.children[0] : cp.children) as SvgNode;
    const d = String(shape.attrs.d);

    expect(d).toContain('M -5 -10');
    expect(d).toContain('L 40 0');
  });
});

describe('buildPrim group clipRef 对抗：指向不存在资源', () => {
  it('clipRef 指向 Scene 没有的资源 id → 仍产 url(#...) 引用（adapter 不校验存在性）', () => {
    const group: GroupPrimitive = {
      type: 'group',
      clipRef: 'clip-ghost',
      children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }],
    };
    const el = buildPrim(group, { clipRefUrl: (id: string) => `url(#C-${id})` });

    // 渲染不抛；产 url 引用（即便资源不存在，SVG 会把 group 当作无可见内容裁掉——这是 SVG 语义，非 adapter bug）
    expect(el.tag).toBe('g');
    expect(el.attrs['clip-path']).toBe('url(#C-clip-ghost)');
  });

  it('clipRef 为空字符串 → 仍走 clipRefUrl（空 id），不当作 undefined', () => {
    const group: GroupPrimitive = {
      type: 'group',
      clipRef: '',
      children: [],
    };
    const el = buildPrim(group, { clipRefUrl: (id: string) => `url(#C-${id})` });

    // clipRef '' !== undefined，应物化（不被 `!== undefined` 守卫跳过）
    expect(el.attrs['clip-path']).toBe('url(#C-)');
  });

  it('嵌套 group 各带 clipRef → 各自物化 clip-path', () => {
    const inner: GroupPrimitive = {
      type: 'group',
      clipRef: 'clip-2',
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, fill: 'blue' }],
    };
    const outer: GroupPrimitive = {
      type: 'group',
      clipRef: 'clip-1',
      children: [inner],
    };
    const el = buildPrim(outer, { clipRefUrl: (id: string) => `url(#${id})` });

    expect(el.attrs['clip-path']).toBe('url(#clip-1)');

    const innerEl = (el.children as Array<SvgNode>)[0];

    expect(innerEl.attrs['clip-path']).toBe('url(#clip-2)');
  });
});
