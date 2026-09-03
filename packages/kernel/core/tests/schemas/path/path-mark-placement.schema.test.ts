import { describe, expect, it } from 'vitest';

import { PathMarkPlacementSchema } from '../../../src';

describe('PathMarkPlacementSchema endpointOverlap', () => {
  it.each([0, 0.5, 1])('保留合法的端点箭头重叠比例 %s', endpointOverlap => {
    expect(
      PathMarkPlacementSchema.parse({
        pos: 1,
        endpointOverlap,
        mark: { kind: 'arrow', shape: 'openCircle' },
      }),
    ).toEqual({
      pos: 1,
      endpointOverlap,
      mark: { kind: 'arrow', shape: 'openCircle' },
    });
  });

  it('省略比例时不向 Source IR 写入默认字段', () => {
    expect(PathMarkPlacementSchema.parse({ pos: 1, mark: { kind: 'arrow' } })).toEqual({
      pos: 1,
      mark: { kind: 'arrow' },
    });
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])('拒绝非法重叠比例 %s', endpointOverlap => {
    expect(PathMarkPlacementSchema.safeParse({ pos: 1, endpointOverlap, mark: { kind: 'arrow' } }).success).toBe(false);
  });

  it('保持 placement strict object，拒绝未知字段', () => {
    expect(
      PathMarkPlacementSchema.safeParse({
        pos: 1,
        endpointOverlap: 0.5,
        mark: { kind: 'arrow' },
        overlap: 0.5,
      }).success,
    ).toBe(false);
  });
});
