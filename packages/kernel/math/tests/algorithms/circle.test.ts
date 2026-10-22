import { describe, expect, it } from 'vitest';

import { circle } from '../../src';

const encloses = (pts: Array<[number, number]>, eps = 1e-6): boolean => {
  const c = circle.minimalEnclosing(pts)!;
  return pts.every(p => Math.hypot(p[0] - c.center[0], p[1] - c.center[1]) <= c.radius + eps);
};

describe('circle.minimalEnclosing', () => {
  it('轴向极值不能决定最终圆时仍覆盖斜向外点并保持最小半径', () => {
    const points: Array<[number, number]> = [
      [-2, 0],
      [2, 0],
      [0, -1],
      [0, 1],
      [1.9, 0.9],
    ];
    const centerY = 7 / 30;
    for (const input of [points, [...points].reverse(), [...points.slice(2), ...points.slice(0, 2)]]) {
      const original = structuredClone(input);
      const result = circle.minimalEnclosing(input)!;
      expect(result.center[0]).toBeCloseTo(0, 10);
      expect(result.center[1]).toBeCloseTo(centerY, 10);
      expect(result.radius).toBeCloseTo(Math.hypot(2, centerY), 10);
      expect(encloses(input)).toBe(true);
      expect(input).toEqual(original);
    }
  });

  it('旋转奇数圆周与重复点保持已知最小圆及输入不变', () => {
    const points: Array<[number, number]> = Array.from({ length: 17 }, (_, index) => {
      const angle = (index * 2 * Math.PI) / 17 + 0.137;
      return [3 + 2 * Math.cos(angle), -4 + 2 * Math.sin(angle)];
    });
    points.push(points[3], points[8]);
    const original = structuredClone(points);
    for (const input of [points, [...points].reverse()]) {
      const result = circle.minimalEnclosing(input)!;
      expect(result.center[0]).toBeCloseTo(3, 10);
      expect(result.center[1]).toBeCloseTo(-4, 10);
      expect(result.radius).toBeCloseTo(2, 10);
    }
    expect(points).toEqual(original);
  });
  it('空集 → null', () => {
    expect(circle.minimalEnclosing([])).toBeNull();
  });

  it('单点 → 半径 0', () => {
    expect(circle.minimalEnclosing([[3, 4]])).toEqual({ center: [3, 4], radius: 0 });
  });

  it('两点 → 直径圆', () => {
    const c = circle.minimalEnclosing([
      [0, 0],
      [4, 0],
    ])!;

    expect(c.center[0]).toBeCloseTo(2, 9);
    expect(c.center[1]).toBeCloseTo(0, 9);
    expect(c.radius).toBeCloseTo(2, 9);
  });

  it('正方形 4 角 → 中心 + 半对角线', () => {
    const c = circle.minimalEnclosing([
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ])!;

    expect(c.center[0]).toBeCloseTo(2, 9);
    expect(c.center[1]).toBeCloseTo(2, 9);
    expect(c.radius).toBeCloseTo(Math.hypot(2, 2), 9);
  });

  it('共线三点 → 最远对直径（含中间点）', () => {
    const c = circle.minimalEnclosing([
      [0, 0],
      [1, 0],
      [2, 0],
    ])!;

    expect(c.center[0]).toBeCloseTo(1, 9);
    expect(c.radius).toBeCloseTo(1, 9);
  });

  it('内部点不撑大圆', () => {
    const c = circle.minimalEnclosing([
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [2, 2],
      [1, 1],
    ])!;

    expect(c.radius).toBeCloseTo(Math.hypot(2, 2), 9);
  });

  it('钝角三角形 → 最长边为直径（外接圆并非最小）', () => {
    // 顶点接近共线的钝角：MEC 应是最长边直径，半径 < 外接圆半径
    const c = circle.minimalEnclosing([
      [0, 0],
      [10, 0],
      [5, 1],
    ])!;

    expect(
      encloses([
        [0, 0],
        [10, 0],
        [5, 1],
      ]),
    ).toBe(true);
    expect(c.radius).toBeLessThan(5.2); // 半径接近 5（最长边半），远小于外接圆
  });

  it('随机一批点全部被覆盖', () => {
    const pts: Array<[number, number]> = [
      [1, 2],
      [5, 3],
      [3, 8],
      [7, 1],
      [2, 6],
      [6, 6],
      [4, 4],
    ];

    expect(encloses(pts)).toBe(true);
  });
});
