import { describe, expect, it } from 'vitest';
import { polar } from '../../src/geometry/polar';

describe('polar.toPosition 极坐标 → 笛卡尔', () => {
  it('angle=0 → +x 方向', () => {
    const [x, y] = polar.toPosition({ angle: 0, radius: 1 });
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });

  it('angle=90 → +y 方向', () => {
    const [x, y] = polar.toPosition({ angle: 90, radius: 1 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });

  it('angle=180 → -x 方向', () => {
    const [x, y] = polar.toPosition({ angle: 180, radius: 1 });
    expect(x).toBeCloseTo(-1);
    expect(y).toBeCloseTo(0);
  });

  it('angle=270 → -y 方向', () => {
    const [x, y] = polar.toPosition({ angle: 270, radius: 1 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-1);
  });

  it('对角 angle=45, radius=sqrt(2) → [1, 1]', () => {
    const [x, y] = polar.toPosition({ angle: 45, radius: Math.SQRT2 });
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(1);
  });

  it('省略 origin → 取 [0, 0]', () => {
    expect(polar.toPosition({ angle: 0, radius: 5 })[0]).toBeCloseTo(5);
  });

  it('origin 是 Position：偏移基于该点', () => {
    const [x, y] = polar.toPosition({ origin: [10, 10], angle: 0, radius: 5 });
    expect(x).toBeCloseTo(15);
    expect(y).toBeCloseTo(10);
  });

  it('origin 嵌套 PolarPosition：递归解析', () => {
    // origin = (angle=0, radius=10) = [10, 0]; 再 angle=90, radius=5 → [10, 5]
    const [x, y] = polar.toPosition({
      origin: { angle: 0, radius: 10 },
      angle: 90,
      radius: 5,
    });
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(5);
  });

  it('origin 是字符串（节点 id）→ 抛错', () => {
    expect(() =>
      polar.toPosition({ origin: 'A', angle: 0, radius: 1 }),
    ).toThrow(/string origin/);
  });
});

describe('polar.fromPosition 笛卡尔 → 极坐标', () => {
  it('[1, 0] → angle=0, radius=1', () => {
    expect(polar.fromPosition([1, 0])).toEqual({ angle: 0, radius: 1 });
  });

  it('[0, 1] → angle=90, radius=1', () => {
    expect(polar.fromPosition([0, 1])).toEqual({ angle: 90, radius: 1 });
  });

  it('[-1, 0] → angle=180, radius=1', () => {
    expect(polar.fromPosition([-1, 0])).toEqual({ angle: 180, radius: 1 });
  });

  it('[0, -1] → angle=-90, radius=1', () => {
    const p = polar.fromPosition([0, -1]);
    expect(p.angle).toBe(-90);
    expect(p.radius).toBe(1);
  });

  it('对角 [1, 1] → angle≈45, radius≈sqrt(2)', () => {
    const p = polar.fromPosition([1, 1]);
    expect(p.angle).toBeCloseTo(45);
    expect(p.radius).toBeCloseTo(Math.SQRT2);
  });
});

describe('polar.toPosition / fromPosition 互为逆变换', () => {
  it.each<[number, number]>([
    [3, 4],
    [-2, 5],
    [1, -1],
    [0.5, 0.5],
  ])('toPosition(fromPosition([%i, %i])) ≈ 原点', (x, y) => {
    const back = polar.toPosition(polar.fromPosition([x, y]));
    expect(back[0]).toBeCloseTo(x);
    expect(back[1]).toBeCloseTo(y);
  });
});

describe('polar.offsetFrom 从某点按极坐标偏移', () => {
  it('原点 [10, 10] + (0°, 5) → [15, 10]', () => {
    const [x, y] = polar.offsetFrom([10, 10], { angle: 0, radius: 5 });
    expect(x).toBeCloseTo(15);
    expect(y).toBeCloseTo(10);
  });

  it('原点 [0, 0] + (90°, 3) → [0, 3]', () => {
    const [x, y] = polar.offsetFrom([0, 0], { angle: 90, radius: 3 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(3);
  });
});

describe('polar.equal 跨坐标系相等判断', () => {
  it('两个笛卡尔点完全相等', () => {
    expect(polar.equal([1, 2], [1, 2])).toBe(true);
  });

  it('笛卡尔 vs 极坐标：等价时相等', () => {
    expect(polar.equal([1, 0], { angle: 0, radius: 1 })).toBe(true);
    expect(polar.equal([0, 1], { angle: 90, radius: 1 })).toBe(true);
  });

  it('极坐标 vs 极坐标：先转笛卡尔再比较', () => {
    expect(
      polar.equal(
        { angle: 45, radius: Math.SQRT2 },
        { angle: 45, radius: Math.SQRT2 },
      ),
    ).toBe(true);
  });

  it('precision=2 下小差异被忽略', () => {
    expect(polar.equal([0.001, 0], [0.002, 0], 2)).toBe(true);
  });

  it('precision=2 下差异 ≥ 0.01 时不等', () => {
    expect(polar.equal([0.001, 0], [0.012, 0], 2)).toBe(false);
  });

  it('precision 默认 = 2', () => {
    expect(polar.equal([0.001, 0], [0.002, 0])).toBe(true);
    expect(polar.equal([0.001, 0], [0.012, 0])).toBe(false);
  });
});
