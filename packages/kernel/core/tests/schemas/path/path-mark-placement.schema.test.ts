import { describe, expect, it } from 'vitest';

import { PathArrowSchema, PathMarkPlacementSchema } from '../../../src';

describe('路径端点与标记 schema', () => {
  it.each([0, 0.5, 1])('端点箭头保留重叠比例 %s', endpointOverlap => {
    expect(PathArrowSchema.parse({ end: { endpointOverlap } })).toEqual({ end: { endpointOverlap } });
  });
  it('标记拒绝端点专有字段', () => {
    expect(PathMarkPlacementSchema.safeParse({ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow' } }).success).toBe(
      false,
    );
  });
  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])('拒绝非法标记位置 %s', pos => {
    expect(PathMarkPlacementSchema.safeParse({ pos, mark: { kind: 'arrow' } }).success).toBe(false);
  });
  it('普通标记参数保持 JSON 往返且不提前物化默认值', () => {
    const source = { pos: 0, mark: { kind: 'custom', name: 'dot', params: { radius: 3 } } };
    expect(PathMarkPlacementSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });
});
