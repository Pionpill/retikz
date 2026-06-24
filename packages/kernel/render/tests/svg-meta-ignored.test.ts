import { describe, expect, it } from 'vitest';
import type { GroupPrim, PathPrim, RectPrim, Scene } from '@retikz/core';
import { buildPrim } from '../src/svg/builders/prim';
import { renderToSvgString } from '../src/svg';

/**
 * meta provenance 对 SVG renderer 不可见：图元带 meta 与不带 meta 产出逐字节一致
 * @description renderer 只读已知字段（id → data-retikz-id、几何 / 样式），不迭代 meta；
 *   故 meta 既不进 attrs、也不改变任何输出。与「meta 不进 DOM」的设计契约对齐。
 */
describe('SVG renderer 忽略 meta', () => {
  it('rect-meta-ignored：带 meta 的 rect 与不带 meta 产出相同 SvgNode（无 meta 派生 attr）', () => {
    const base: RectPrim = { type: 'rect', id: 'a', x: 0, y: 0, width: 10, height: 10, fill: '#f00' };
    const withMeta: RectPrim = { ...base, meta: { source: 'plot', datum: 3 } };
    expect(buildPrim(withMeta)).toEqual(buildPrim(base));
    expect('meta' in buildPrim(withMeta).attrs).toBe(false);
  });

  it('path-meta-ignored：带 meta 的 path 产出与不带一致', () => {
    const base: PathPrim = {
      type: 'path',
      id: 'edge1',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 10] },
      ],
      stroke: '#000',
    };
    expect(buildPrim({ ...base, meta: { series: 'trend' } })).toEqual(buildPrim(base));
  });

  it('group-meta-ignored：带 meta 的 group 产出与不带一致', () => {
    const base: GroupPrim = {
      type: 'group',
      id: 'sc',
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, stroke: '#444' }],
    };
    expect(buildPrim({ ...base, meta: { layer: 'marks' } })).toEqual(buildPrim(base));
  });

  it('fragment-parity：含 meta 的整场景 → SVG 字符串与剥掉 meta 版逐字节一致', () => {
    const layout = { x: 0, y: 0, width: 100, height: 100 };
    const withMeta: Scene = {
      layout,
      primitives: [
        { type: 'rect', id: 'a', x: 0, y: 0, width: 10, height: 10, fill: '#f00', meta: { source: 'plot', datum: 1 } },
        {
          type: 'group',
          id: 'g',
          meta: { layer: 'marks' },
          children: [{ type: 'rect', x: 20, y: 0, width: 10, height: 10, fill: '#00f' }],
        },
      ],
    };
    const without: Scene = {
      layout,
      primitives: [
        { type: 'rect', id: 'a', x: 0, y: 0, width: 10, height: 10, fill: '#f00' },
        { type: 'group', id: 'g', children: [{ type: 'rect', x: 20, y: 0, width: 10, height: 10, fill: '#00f' }] },
      ],
    };
    const options = { idPrefix: 'fig' };
    expect(renderToSvgString(withMeta, options)).toBe(renderToSvgString(without, options));
  });
});
