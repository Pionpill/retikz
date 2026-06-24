import { describe, expect, it } from 'vitest';
import type { MarkerPrimitive } from '@retikz/core';
import { buildMarkerPrim } from '../src/svg/builders/marker-prim';

/**
 * marker group 的 transforms 必须落到 SVG `<g>` 的 transform 属性——锁定 SVG 与 Canvas 后端
 * 对带 transform 复合箭头的几何一致性（曾出现 SVG group 分支丢弃 transforms 的分歧）。
 */
describe('marker group transform', () => {
  it('group 的 transforms 落到 <g> 的 transform 属性', () => {
    const group: MarkerPrimitive = {
      type: 'group',
      transforms: [{ kind: 'translate', x: 3, y: 4 }],
      children: [],
    };
    const node = buildMarkerPrim(group);
    expect(node.tag).toBe('g');
    expect(node.attrs.transform).toBe('translate(3 4)');
  });

  it('无 transforms 时不写 transform 属性', () => {
    const group: MarkerPrimitive = { type: 'group', children: [] };
    const node = buildMarkerPrim(group);
    expect(node.attrs.transform).toBeUndefined();
  });
});
