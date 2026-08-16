import { describe, expect, it } from 'vitest';

import { rayArc } from '../../src';

describe('rayArc', () => {
  it('射线穿过整圆：两个正向参数，升序', () => {
    const hits = rayArc({
      origin: [-5, 0],
      dir: [1, 0],
      center: [0, 0],
      radius: 2,
      startAngleDeg: 0,
      endAngleDeg: 360,
    });
    expect(hits.length).toBe(2);
    expect(hits[0]).toBeCloseTo(3, 9); // 命中 x=-2
    expect(hits[1]).toBeCloseTo(7, 9); // 命中 x=2
  });

  it('非单位方向按 origin + s * dir 的一般参数方程返回参数', () => {
    const hits = rayArc({
      origin: [-5, 0],
      dir: [2, 0],
      center: [0, 0],
      radius: 2,
      startAngleDeg: 0,
      endAngleDeg: 360,
    });
    expect(hits.length).toBe(2);
    expect(hits[0]).toBeCloseTo(1.5, 9); // origin + 1.5 * [2, 0] = [-2, 0]
    expect(hits[1]).toBeCloseTo(3.5, 9); // origin + 3.5 * [2, 0] = [2, 0]
  });

  it('零方向没有正向射线交点', () => {
    expect(
      rayArc({ origin: [-5, 0], dir: [0, 0], center: [0, 0], radius: 2, startAngleDeg: 0, endAngleDeg: 360 }),
    ).toEqual([]);
  });

  it('未命中（射线离圆心 > 半径）返回空', () => {
    expect(
      rayArc({ origin: [0, 5], dir: [1, 0], center: [0, 0], radius: 2, startAngleDeg: 0, endAngleDeg: 360 }),
    ).toEqual([]);
  });

  it('角度过滤：仅保留落在弧区间内的交点', () => {
    // 圆周交点角度 0(x=2，在 [0,90]) 与 180(x=-2，区间外) → 只留 x=2（s=7）
    const hits = rayArc({
      origin: [-5, 0],
      dir: [1, 0],
      center: [0, 0],
      radius: 2,
      startAngleDeg: 0,
      endAngleDeg: 90,
    });
    expect(hits.length).toBe(1);
    expect(hits[0]).toBeCloseTo(7, 9);
  });
});
