import { describe, expect, it } from 'vitest';
import type { GroupPrim, PathPrim, RectPrim, Scene } from '@retikz/core';
import { buildPrim } from '../src/svg/builders/prim';
import { buildSvgFragment } from '../src/svg/builders/document';
import type { SvgNode } from '../src/svg/types';

/**
 * ADR-01 水合：SVG renderer 从 ScenePrimitive.id emit data-retikz-id attribute
 * @description 带 id 的图元 → attrs['data-retikz-id'] === id；无 id → attrs 不含该键。
 *   stub 阶段 buildPrim 尚未 emit，断言此刻预期 fail。
 */
const layout = { x: 0, y: 0, width: 100, height: 100 };

describe('SVG emit data-retikz-id', () => {
  it('rect-with-id：带 id 的 rect 图元 → data-retikz-id 等于该 id', () => {
    const rect: RectPrim = { type: 'rect', id: 'a', x: 0, y: 0, width: 10, height: 10, fill: '#f00' };
    const node = buildPrim(rect);
    expect(node.attrs['data-retikz-id']).toBe('a');
  });

  it('path-with-id：带 id 的 path 图元 → data-retikz-id 等于该 id', () => {
    const path: PathPrim = {
      type: 'path',
      id: 'edge1',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 10] },
      ],
      stroke: '#000',
    };
    const node = buildPrim(path);
    expect(node.attrs['data-retikz-id']).toBe('edge1');
  });

  it('group-with-id：带 id 的 group 图元 → data-retikz-id 等于该 id', () => {
    const group: GroupPrim = {
      type: 'group',
      id: 'sc',
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, stroke: '#444' }],
    };
    const node = buildPrim(group);
    expect(node.attrs['data-retikz-id']).toBe('sc');
  });

  it('no-id-omits-attr：无 id 的图元 → attrs 不含 data-retikz-id', () => {
    const rect: RectPrim = { type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#f00' };
    const node = buildPrim(rect);
    expect('data-retikz-id' in node.attrs).toBe(false);
  });

  it('ellipse-and-text-with-id：ellipse / text 图元同样 emit data-retikz-id', () => {
    const ellipse = buildPrim({ type: 'ellipse', id: 'el', cx: 5, cy: 5, rx: 3, ry: 2, fill: '#0f0' });
    expect(ellipse.attrs['data-retikz-id']).toBe('el');
    const text = buildPrim({
      type: 'text',
      id: 'tx',
      x: 0,
      y: 0,
      lines: [{ text: 'A' }],
      fontSize: 12,
      align: 'start',
      baseline: 'top',
      lineHeight: 14,
      measuredWidth: 12,
      measuredHeight: 14,
      fill: '#333',
    });
    expect(text.attrs['data-retikz-id']).toBe('tx');
  });

  it('fragment-emits-data-id：经 buildSvgFragment 整树产出 → 带 id 图元含 data-retikz-id', () => {
    const scene: Scene = {
      layout,
      primitives: [
        { type: 'rect', id: 'a', x: 0, y: 0, width: 10, height: 10, fill: '#f00' },
        { type: 'rect', x: 20, y: 0, width: 10, height: 10, fill: '#00f' },
      ],
    };
    const nodes = buildSvgFragment(scene, { idPrefix: 'fig' });
    const rects = nodes.filter((n): n is SvgNode => typeof n !== 'string' && n.tag === 'rect');
    expect(rects[0].attrs['data-retikz-id']).toBe('a');
    expect('data-retikz-id' in rects[1].attrs).toBe(false);
  });
});
