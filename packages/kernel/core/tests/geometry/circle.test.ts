import { describe, expect, it } from 'vitest';
import { type Circle, circle } from '../../src/geometry/circle';

const c10: Circle = { x: 0, y: 0, radius: 10 };

describe('circle.center', () => {
  it('中心 = (x, y)', () => {
    expect(circle.center({ x: 3, y: 7, radius: 5 })).toEqual([3, 7]);
  });
});

describe('circle.contains', () => {
  it('中心点在内', () => {
    expect(circle.contains(c10, [0, 0])).toBe(true);
  });

  it('边界点（含等号）属于"在内"', () => {
    expect(circle.contains(c10, [10, 0])).toBe(true);
    expect(circle.contains(c10, [0, 10])).toBe(true);
    expect(circle.contains(c10, [-10, 0])).toBe(true);
  });

  it('外部点 false', () => {
    expect(circle.contains(c10, [10.01, 0])).toBe(false);
    expect(circle.contains(c10, [8, 8])).toBe(false); // 8² + 8² = 128 > 100
  });
});

describe('circle.anchor', () => {
  it('center / N / S / E / W', () => {
    expect(circle.anchor(c10, 'center')).toEqual([0, 0]);
    expect(circle.anchor(c10, 'north')).toEqual([0, -10]);
    expect(circle.anchor(c10, 'south')).toEqual([0, 10]);
    expect(circle.anchor(c10, 'east')).toEqual([10, 0]);
    expect(circle.anchor(c10, 'west')).toEqual([-10, 0]);
  });

  it('对角 anchor 在 45° 处（圆周等距分布）', () => {
    const ne = circle.anchor(c10, 'north-east');
    expect(ne[0]).toBeCloseTo(10 * Math.SQRT1_2);
    expect(ne[1]).toBeCloseTo(-10 * Math.SQRT1_2);
  });
});

describe('circle.boundaryPoint', () => {
  it('沿 +x 方向射线 → east', () => {
    const p = circle.boundaryPoint(c10, [1000, 0]);
    expect(p[0]).toBeCloseTo(10);
    expect(p[1]).toBeCloseTo(0);
  });

  it('沿对角方向射线 → 半径处对角点', () => {
    const p = circle.boundaryPoint(c10, [1, 1]);
    expect(p[0]).toBeCloseTo(10 * Math.SQRT1_2);
    expect(p[1]).toBeCloseTo(10 * Math.SQRT1_2);
  });

  it('toward = 中心 → 退化返回中心', () => {
    expect(circle.boundaryPoint(c10, [0, 0])).toEqual([0, 0]);
  });

  it('交点距中心恒等于 radius', () => {
    for (const toward of [
      [3, 4],
      [-7, 1],
      [0.5, -100],
    ] as Array<[number, number]>) {
      const p = circle.boundaryPoint(c10, toward);
      expect(Math.sqrt(p[0] * p[0] + p[1] * p[1])).toBeCloseTo(10);
    }
  });
});
