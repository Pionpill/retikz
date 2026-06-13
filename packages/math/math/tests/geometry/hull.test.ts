import { describe, expect, it } from 'vitest';
import { convexHull } from '../../src/geometry/hull';

describe('convexHull（Andrew monotone chain，CCW，不含共线中间点）', () => {
  it('正方形 + 内点 → 4 角', () => {
    const pts: Array<[number, number]> = [[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]];
    expect(convexHull(pts)).toEqual([[0, 0], [4, 0], [4, 4], [0, 4]]);
  });
  it('共线点剔除', () => {
    const pts: Array<[number, number]> = [[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]];
    expect(convexHull(pts)).toEqual([[0, 0], [2, 0], [2, 2], [0, 2]]);
  });
  it('少于 3 点原样（排序去重后）返回', () => {
    expect(convexHull([[1, 1], [0, 0]])).toEqual([[0, 0], [1, 1]]);
  });
});
