import { describe, expect, it } from 'vitest';

import { polar } from '../../../src/shared/geometry/polar';

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
    expect(() => polar.toPosition({ origin: 'A', angle: 0, radius: 1 })).toThrow(/string origin/);
  });
});
