import { describe, expect, it } from 'vitest';
import { type Diamond, diamond } from '../../src/geometry/diamond';

const d: Diamond = { x: 0, y: 0, halfA: 10, halfB: 5 };

describe('diamond.center', () => {
  it('中心 = (x, y)', () => {
    expect(diamond.center({ x: 3, y: 7, halfA: 4, halfB: 2 })).toEqual([3, 7]);
  });
});

describe('diamond.contains', () => {
  it('中心 / 4 顶点在内', () => {
    expect(diamond.contains(d, [0, 0])).toBe(true);
    expect(diamond.contains(d, [10, 0])).toBe(true);
    expect(diamond.contains(d, [-10, 0])).toBe(true);
    expect(diamond.contains(d, [0, 5])).toBe(true);
    expect(diamond.contains(d, [0, -5])).toBe(true);
  });

  it('|x|/halfA + |y|/halfB = 1 是边界', () => {
    expect(diamond.contains(d, [5, 2.5])).toBe(true); // 0.5 + 0.5 = 1
    expect(diamond.contains(d, [5, 2.6])).toBe(false); // > 1
  });

  it('外部点 false', () => {
    expect(diamond.contains(d, [10.01, 0])).toBe(false);
    expect(diamond.contains(d, [6, 3])).toBe(false); // 0.6 + 0.6 = 1.2
  });
});

describe('diamond.anchor', () => {
  it('N / S / E / W = 4 顶点', () => {
    expect(diamond.anchor(d, 'east')).toEqual([10, 0]);
    expect(diamond.anchor(d, 'west')).toEqual([-10, 0]);
    expect(diamond.anchor(d, 'north')).toEqual([0, -5]);
    expect(diamond.anchor(d, 'south')).toEqual([0, 5]);
  });

  it('对角 anchor = 4 边的中点', () => {
    expect(diamond.anchor(d, 'north-east')).toEqual([5, -2.5]);
    expect(diamond.anchor(d, 'south-east')).toEqual([5, 2.5]);
    expect(diamond.anchor(d, 'north-west')).toEqual([-5, -2.5]);
    expect(diamond.anchor(d, 'south-west')).toEqual([-5, 2.5]);
  });
});

describe('diamond.boundaryPoint', () => {
  it('沿 +x → east 顶点', () => {
    const p = diamond.boundaryPoint(d, [100, 0]);
    expect(p[0]).toBeCloseTo(10);
    expect(p[1]).toBeCloseTo(0);
  });

  it('沿 +y → south 顶点', () => {
    const p = diamond.boundaryPoint(d, [0, 100]);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(5);
  });

  it('交点满足菱形方程 |x|/halfA + |y|/halfB = 1', () => {
    for (const toward of [
      [3, 4],
      [-7, 1],
      [0.5, -100],
    ] as Array<[number, number]>) {
      const p = diamond.boundaryPoint(d, toward);
      const v = Math.abs(p[0]) / d.halfA + Math.abs(p[1]) / d.halfB;
      expect(v).toBeCloseTo(1);
    }
  });

  it('toward = 中心 → 退化返回中心', () => {
    expect(diamond.boundaryPoint(d, [0, 0])).toEqual([0, 0]);
  });
});
