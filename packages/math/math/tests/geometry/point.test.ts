import { describe, expect, it } from 'vitest';
import { type Position, lerp, point } from '../../src/geometry/point';

describe('point 向量运算', () => {
  it('add / sub / scale', () => {
    expect(point.add([1, 2], [3, 4])).toEqual([4, 6]);
    expect(point.sub([3, 4], [1, 2])).toEqual([2, 2]);
    expect(point.scale([1, 2], 3)).toEqual([3, 6]);
  });
  it('length / normalize 零向量回退 fallback', () => {
    expect(point.length([3, 4])).toBe(5);
    expect(point.normalize([0, 0], [1, 0])).toEqual([1, 0]);
    expect(point.normalize([0, 5])).toEqual([0, 1]);
  });
  it('dot / cross', () => {
    expect(point.dot([1, 2], [3, 4])).toBe(11);
    expect(point.cross([1, 0], [0, 1])).toBe(1);
  });
  it('equal 精确相等', () => {
    expect(point.equal([1, 2], [1, 2])).toBe(true);
    expect(point.equal([1, 2], [1, 3])).toBe(false);
  });
  it('shiftToward 沿方向移动 dist', () => {
    expect(point.shiftToward([0, 0], [10, 0], 3)).toEqual([3, 0]);
    expect(point.shiftToward([0, 0], [0, 0], 3)).toEqual([0, 0]);
  });
  it('lerp 线性插值', () => {
    const r: Position = lerp([0, 0], [10, 20], 0.5);
    expect(r).toEqual([5, 10]);
  });
});
