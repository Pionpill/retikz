import { describe, expect, it } from 'vitest';
import { point } from '../../src/geometry/point';

describe('point 基础向量运算', () => {
  it('add 向量相加', () => {
    expect(point.add([1, 2], [3, 4])).toEqual([4, 6]);
  });

  it('sub 向量相减', () => {
    expect(point.sub([5, 8], [2, 3])).toEqual([3, 5]);
  });

  it('scale 等比缩放', () => {
    expect(point.scale([2, -3], 4)).toEqual([8, -12]);
  });

  it('equal 严格相等（无容差）', () => {
    expect(point.equal([1, 2], [1, 2])).toBe(true);
    expect(point.equal([1, 2], [1, 2.0])).toBe(true);
    expect(point.equal([1, 2], [1, 2.0000001])).toBe(false);
  });
});

describe('point.toPolar 笛卡尔 → 极坐标', () => {
  it('+x 方向 angle=0', () => {
    const p = point.toPolar([1, 0]);
    expect(p.angle).toBe(0);
    expect(p.radius).toBe(1);
  });

  it('+y 方向 angle=90（SVG y 轴向下，也按数学 atan2 计算）', () => {
    const p = point.toPolar([0, 1]);
    expect(p.angle).toBe(90);
    expect(p.radius).toBe(1);
  });

  it('-x 方向 angle=180', () => {
    const p = point.toPolar([-1, 0]);
    expect(p.angle).toBe(180);
    expect(p.radius).toBe(1);
  });

  it('-y 方向 angle=-90（落在 (-180, 180]）', () => {
    const p = point.toPolar([0, -1]);
    expect(p.angle).toBe(-90);
    expect(p.radius).toBe(1);
  });

  it('对角 [1, 1] → 45° / sqrt(2)', () => {
    const p = point.toPolar([1, 1]);
    expect(p.angle).toBeCloseTo(45);
    expect(p.radius).toBeCloseTo(Math.SQRT2);
  });
});

describe('point.equalPolar 跨坐标系相等判断 + precision 切换', () => {
  it('两个笛卡尔点完全相等', () => {
    expect(point.equalPolar([1, 2], [1, 2])).toBe(true);
  });

  it('笛卡尔 vs 极坐标：等价时相等', () => {
    expect(point.equalPolar([1, 0], { angle: 0, radius: 1 })).toBe(true);
    expect(point.equalPolar([0, 1], { angle: 90, radius: 1 })).toBe(true);
  });

  it('极坐标 vs 极坐标：先转笛卡尔再比较', () => {
    expect(
      point.equalPolar(
        { angle: 45, radius: Math.SQRT2 },
        { angle: 45, radius: Math.SQRT2 },
      ),
    ).toBe(true);
  });

  describe('precision=0（按整数四舍五入比较）', () => {
    it('差距 < 0.5 视为同一整数', () => {
      expect(point.equalPolar([1.4, 2.3], [1, 2], 0)).toBe(true);
    });

    it('差距 ≥ 1 一定不等', () => {
      expect(point.equalPolar([0.4, 0], [1.4, 0], 0)).toBe(false);
    });
  });

  describe('precision=2（默认，2 位小数四舍五入）', () => {
    it('小数第 4 位差异在 precision=2 下被忽略', () => {
      expect(point.equalPolar([0.001, 0], [0.002, 0], 2)).toBe(true);
    });

    it('小数第 2 位差异 ≥ 0.01 时不等', () => {
      expect(point.equalPolar([0.001, 0], [0.012, 0], 2)).toBe(false);
    });

    it('precision 默认 = 2', () => {
      expect(point.equalPolar([0.001, 0], [0.002, 0])).toBe(true);
      expect(point.equalPolar([0.001, 0], [0.012, 0])).toBe(false);
    });
  });

  describe('precision=5（高精度比较）', () => {
    it('precision=2 下相等的两点在 precision=5 下被区分', () => {
      // 两点小数第 3 位差异：precision=2 相等，precision=5 不等
      expect(point.equalPolar([0.001, 0], [0.002, 0], 2)).toBe(true);
      expect(point.equalPolar([0.001, 0], [0.002, 0], 5)).toBe(false);
    });

    it('小数第 6 位以下的差异在 precision=5 下被忽略', () => {
      expect(point.equalPolar([0.000001, 0], [0.000002, 0], 5)).toBe(true);
    });
  });
});
