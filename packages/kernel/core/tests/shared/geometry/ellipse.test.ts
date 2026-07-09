import { describe, expect, it } from 'vitest';

import type { Ellipse } from '../../../src/shared/geometry/ellipse';

import { Anchor } from '../../../src/shared';
import { ellipse } from '../../../src/shared/geometry/ellipse';

const e: Ellipse = { x: 0, y: 0, rx: 10, ry: 5 };

describe('ellipse 退化（零半轴）不产 NaN', () => {
  const degenerate: Ellipse = { x: 1, y: 2, rx: 0, ry: 5 };
  it('contains → false（不除零产 NaN）', () => {
    expect(ellipse.contains(degenerate, [1, 2])).toBe(false);
  });
  it('boundaryPoint → 塌缩到中心', () => {
    expect(ellipse.boundaryPoint(degenerate, [5, 5])).toEqual([1, 2]);
  });
});

describe('ellipse.center', () => {
  it('中心 = (x, y)', () => {
    expect(ellipse.center({ x: 3, y: 7, rx: 4, ry: 2 })).toEqual([3, 7]);
  });
});

describe('ellipse.contains', () => {
  it('中心 / 4 个轴端点在内', () => {
    expect(ellipse.contains(e, [0, 0])).toBe(true);
    expect(ellipse.contains(e, [10, 0])).toBe(true);
    expect(ellipse.contains(e, [-10, 0])).toBe(true);
    expect(ellipse.contains(e, [0, 5])).toBe(true);
    expect(ellipse.contains(e, [0, -5])).toBe(true);
  });

  it('外部点 false', () => {
    expect(ellipse.contains(e, [10.01, 0])).toBe(false);
    expect(ellipse.contains(e, [8, 4])).toBe(false); // 8²/100 + 4²/25 = 0.64 + 0.64 = 1.28 > 1
  });
});

describe('ellipse.anchor', () => {
  it('4 轴端点对应 N / S / E / W', () => {
    expect(ellipse.anchor(e, Anchor.Right)).toEqual([10, 0]);
    expect(ellipse.anchor(e, Anchor.Left)).toEqual([-10, 0]);
    expect(ellipse.anchor(e, Anchor.Top)).toEqual([0, -5]);
    expect(ellipse.anchor(e, Anchor.Bottom)).toEqual([0, 5]);
  });

  it('对角 anchor 取参数 t=π/4 处：(rx/√2, ry/√2)', () => {
    const ne = ellipse.anchor(e, Anchor.TopRight);
    expect(ne[0]).toBeCloseTo(10 * Math.SQRT1_2);
    expect(ne[1]).toBeCloseTo(-5 * Math.SQRT1_2);
  });
});

describe('ellipse.boundaryPoint', () => {
  it('沿 +x → right', () => {
    const p = ellipse.boundaryPoint(e, [100, 0]);
    expect(p[0]).toBeCloseTo(10);
    expect(p[1]).toBeCloseTo(0);
  });

  it('沿 +y → bottom', () => {
    const p = ellipse.boundaryPoint(e, [0, 100]);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(5);
  });

  it('交点满足椭圆方程 (x/rx)² + (y/ry)² = 1', () => {
    for (const toward of [
      [3, 4],
      [-7, 1],
      [0.5, -100],
    ] as Array<[number, number]>) {
      const p = ellipse.boundaryPoint(e, toward);
      const v = (p[0] / e.rx) ** 2 + (p[1] / e.ry) ** 2;
      expect(v).toBeCloseTo(1);
    }
  });
});
