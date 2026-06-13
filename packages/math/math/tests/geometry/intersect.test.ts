import { describe, expect, it } from 'vitest';
import { intersect } from '../../src/geometry/intersect';

describe('intersect', () => {
  it('lineLine：相交返回交点，平行返回 null', () => {
    expect(intersect.lineLine([0, 0], [2, 2], [0, 2], [2, 0])).toEqual([1, 1]);
    expect(intersect.lineLine([0, 0], [1, 0], [0, 1], [1, 1])).toBeNull();
  });
  it('lineCircle：割线 2 交点 / 相离 0', () => {
    const hits = intersect.lineCircle([-5, 0], [1, 0], [0, 0], 2);
    expect(hits.map(h => h[0]).sort((a, b) => a - b)).toEqual([-2, 2]);
    expect(intersect.lineCircle([0, 5], [1, 0], [0, 0], 2)).toEqual([]);
  });
  it('circleCircle：相交 2 点', () => {
    const hits = intersect.circleCircle([0, 0], 2, [3, 0], 2);
    expect(hits.length).toBe(2);
    expect(hits[0][0]).toBeCloseTo(1.5, 9);
  });
  it('circleCircle：相离 / 内含返回空', () => {
    expect(intersect.circleCircle([0, 0], 1, [10, 0], 1)).toEqual([]);
    expect(intersect.circleCircle([0, 0], 5, [0, 0], 1)).toEqual([]);
  });
  it('segmentSegment：真交叉返回交点，不相交/共线返回 null', () => {
    expect(intersect.segmentSegment([0, 0], [2, 2], [0, 2], [2, 0])).toEqual([1, 1]);
    expect(intersect.segmentSegment([0, 0], [1, 0], [0, 1], [1, 1])).toBeNull();
    expect(intersect.segmentSegment([0, 0], [1, 1], [2, 2], [3, 3])).toBeNull(); // 共线不重叠
    expect(intersect.segmentSegment([0, 0], [1, 0], [2, 0], [3, 0])).toBeNull(); // 共线
  });
  it('rayArc 转出可用', () => {
    const hits = intersect.rayArc([-5, 0], [1, 0], [0, 0], 2, 0, 360);
    expect(hits.length).toBe(2);
  });
});
