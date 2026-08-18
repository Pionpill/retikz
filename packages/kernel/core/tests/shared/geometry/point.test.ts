import { describe, expect, it } from 'vitest';

import { point, vector2 } from '../../../src/shared/geometry/point';

describe('point / vector2 基础运算', () => {
  it('add 向量相加', () => {
    expect(vector2.add([1, 2], [3, 4])).toEqual([4, 6]);
  });

  it('sub 向量相减', () => {
    expect(vector2.sub([5, 8], [2, 3])).toEqual([3, 5]);
  });

  it('scale 等比缩放', () => {
    expect(vector2.scale([2, -3], 4)).toEqual([8, -12]);
  });

  it('equal 严格相等（无容差）', () => {
    expect(point.equal([1, 2], [1, 2])).toBe(true);
    expect(point.equal([1, 2], [1, 2.0])).toBe(true);
    expect(point.equal([1, 2], [1, 2.0000001])).toBe(false);
  });
});
