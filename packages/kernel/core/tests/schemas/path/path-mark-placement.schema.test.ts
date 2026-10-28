import { describe, expect, it } from 'vitest';

import { PathArrowSchema, PathMarkPlacementSchema } from '../../../src';

describe('路径端点与标记 schema', () => {
  it.each([0, 0.5, 1])('端点箭头保留重叠比例 %s', endpointOverlap => {
    expect(PathArrowSchema.parse({ end: { endpointOverlap } })).toEqual({ end: { endpointOverlap } });
  });
  it('标记拒绝端点专有字段', () => {
    expect(PathMarkPlacementSchema.safeParse({ pos: 1, endpointOverlap: 0.5 }).success).toBe(false);
  });
  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])('拒绝非法标记位置 %s', pos => {
    expect(PathMarkPlacementSchema.safeParse({ pos }).success).toBe(false);
  });
  it('普通标记参数保持 JSON 往返且不提前物化默认值', () => {
    const source = { pos: 0, shape: 'dot', params: { radius: 3 } };
    expect(PathMarkPlacementSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });
});

it('平面标记拒绝结构包装并接受共享外观', () => {
  const source = { pos: 0.5, shape: 'checkpoint', rotate: 30, scale: 2, fill: 'red', params: { radius: 3 } };
  expect(PathMarkPlacementSchema.parse(source)).toEqual(source);
  for (const extra of [{ kind: 'arrow' }, { mark: { shape: 'stealth' } }])
    expect(PathMarkPlacementSchema.safeParse({ ...source, ...extra }).success).toBe(false);
});
