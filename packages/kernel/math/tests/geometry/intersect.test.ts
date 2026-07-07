import { describe, expect, it } from 'vitest';

import { intersect } from '../../src';

describe('intersect', () => {
  it('lineLine：相交返回交点，平行返回 null', () => {
    expect(intersect.lineLine({ a1: [0, 0], a2: [2, 2], b1: [0, 2], b2: [2, 0] })).toEqual([1, 1]);
    expect(intersect.lineLine({ a1: [0, 0], a2: [1, 0], b1: [0, 1], b2: [1, 1] })).toBeNull();
  });
  it('lineCircle：割线 2 交点 / 相离 0', () => {
    const hits = intersect.lineCircle({ origin: [-5, 0], dir: [1, 0], center: [0, 0], radius: 2 });
    expect(hits.map(h => h[0]).sort((a, b) => a - b)).toEqual([-2, 2]);
    expect(intersect.lineCircle({ origin: [0, 5], dir: [1, 0], center: [0, 0], radius: 2 })).toEqual([]);
  });
  it('circleCircle：相交 2 点', () => {
    const hits = intersect.circleCircle({ centerA: [0, 0], radiusA: 2, centerB: [3, 0], radiusB: 2 });
    expect(hits.length).toBe(2);
    expect(hits[0][0]).toBeCloseTo(1.5, 9);
  });
  it('circleCircle：相离 / 内含返回空', () => {
    expect(intersect.circleCircle({ centerA: [0, 0], radiusA: 1, centerB: [10, 0], radiusB: 1 })).toEqual([]);
    expect(intersect.circleCircle({ centerA: [0, 0], radiusA: 5, centerB: [0, 0], radiusB: 1 })).toEqual([]);
  });
  it('segmentSegment：真交叉返回交点，不相交/共线返回 null', () => {
    expect(intersect.segmentSegment({ a1: [0, 0], a2: [2, 2], b1: [0, 2], b2: [2, 0] })).toEqual([1, 1]);
    expect(intersect.segmentSegment({ a1: [0, 0], a2: [1, 0], b1: [0, 1], b2: [1, 1] })).toBeNull();
    expect(intersect.segmentSegment({ a1: [0, 0], a2: [1, 1], b1: [2, 2], b2: [3, 3] })).toBeNull(); // 共线不重叠
    expect(intersect.segmentSegment({ a1: [0, 0], a2: [1, 0], b1: [2, 0], b2: [3, 0] })).toBeNull(); // 共线
  });
});
