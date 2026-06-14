import { describe, expect, it } from 'vitest';
import { polygon } from '../../src/geometry/polygon';

const square: Array<[number, number]> = [[0, 0], [4, 0], [4, 4], [0, 4]];

describe('polygon.containsPoint', () => {
  it('内部点为真', () => { expect(polygon.containsPoint(square, [2, 2])).toBe(true); });
  it('外部点为假', () => { expect(polygon.containsPoint(square, [5, 2])).toBe(false); });
  it('少于 3 顶点为假', () => { expect(polygon.containsPoint([[0, 0], [1, 1]], [0, 0])).toBe(false); });
  it('凹多边形（L 形）正确——含凹口剔除', () => {
    // L 形：横臂 y∈[0,2]×x∈[0,4]，竖臂 x∈[0,2]×y∈[0,4]，缺口在右上 (x>2,y>2)
    // 测试点刻意避开顶点所在的 y=0/2/4 与 x=0/2/4，规避 ray-casting 顶点退化
    const lshape: Array<[number, number]> = [[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]];
    expect(polygon.containsPoint(lshape, [3, 1])).toBe(true); // 横臂内
    expect(polygon.containsPoint(lshape, [1, 3])).toBe(true); // 竖臂内
    expect(polygon.containsPoint(lshape, [1, 1])).toBe(true); // 两臂交叠角
    expect(polygon.containsPoint(lshape, [3, 3])).toBe(false); // 凹口（缺口）→ 外
    expect(polygon.containsPoint(lshape, [5, 5])).toBe(false); // 远处 → 外
  });
});
