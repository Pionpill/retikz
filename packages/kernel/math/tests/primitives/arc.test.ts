import { describe, expect, it } from 'vitest';

import {
  collectArcBoundingCandidates,
  collectEllipseArcBoundingCandidates,
  DEFAULT_EPSILON,
  isAngleWithinArcSweep,
  pointAtArcAngle,
} from '../../src';

/*
 * 约定（与 polar.ts 一致）：
 *   endpoint = [cx + r·cos(θ), cy + r·sin(θ)]   // y 不翻转，沿用 SVG y-down
 *   - angle=0   → +x（east）
 *   - angle=90  → +y（在 SVG 上视觉为下，即 "south"）
 *   - angle=180 → -x（west）
 *   - angle=270 → -y（在 SVG 上视觉为上，即 "north"）
 */

describe('pointAtArcAngle 圆周点投影', () => {
  it('center=[0,0], radius=10, angle=0 → [10, 0]', () => {
    const [x, y] = pointAtArcAngle([0, 0], 10, 0);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(0);
  });

  it('center=[0,0], radius=10, angle=90 → [0, 10]（与 polar.toPosition 同约定）', () => {
    const [x, y] = pointAtArcAngle([0, 0], 10, 90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
  });

  it('center=[0,0], radius=10, angle=180 → [-10, 0]', () => {
    const [x, y] = pointAtArcAngle([0, 0], 10, 180);
    expect(x).toBeCloseTo(-10);
    expect(y).toBeCloseTo(0);
  });

  it('center=[0,0], radius=10, angle=270 → [0, -10]', () => {
    const [x, y] = pointAtArcAngle([0, 0], 10, 270);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-10);
  });

  it('angle=360 与 angle=0 同点', () => {
    const a = pointAtArcAngle([0, 0], 10, 360);
    const b = pointAtArcAngle([0, 0], 10, 0);
    expect(a[0]).toBeCloseTo(b[0]);
    expect(a[1]).toBeCloseTo(b[1]);
  });

  it('center=[5, 5], radius=3, angle=0 → [8, 5]', () => {
    const [x, y] = pointAtArcAngle([5, 5], 3, 0);
    expect(x).toBeCloseTo(8);
    expect(y).toBeCloseTo(5);
  });

  it('负角度 angle=-90 等价 270 → [0, -10]', () => {
    const [x, y] = pointAtArcAngle([0, 0], 10, -90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-10);
  });
});

describe('collectArcBoundingCandidates 弧 bbox 极值候选点', () => {
  // 工具：粗略验证某点是否在结果集合里
  const containsPoint = (list: Array<[number, number]>, target: [number, number], eps = DEFAULT_EPSILON): boolean =>
    list.some(([x, y]) => Math.abs(x - target[0]) < eps && Math.abs(y - target[1]) < eps);

  it('0°→90° 无穿越基本方向：仅返回端点', () => {
    const pts = collectArcBoundingCandidates({ center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 90 });
    // 起点 [10, 0]、终点 [0, 10]，不应再有其它点
    expect(pts.length).toBe(2);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
  });

  it('0°→180° 穿越 90°：含三个点（起点、90°、终点）', () => {
    const pts = collectArcBoundingCandidates({ center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 180 });
    expect(pts.length).toBe(3);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true); // 90° 投影
    expect(containsPoint(pts, [-10, 0])).toBe(true);
  });

  it('270°→90°（CCW 跨 360°）：穿越 0° 与 90°', () => {
    // 270° 起点 = [0, -10]；穿过 360°(=0°) → [10, 0]；再到 90° → [0, 10]
    const pts = collectArcBoundingCandidates({
      center: [0, 0],
      radius: 10,
      startAngleDeg: 270,
      endAngleDeg: 450,
    });
    // 起点 [0, -10], 0° → [10, 0], 90° → [0, 10], 终点（450°=90°）= [0, 10]
    // 终点与 90° 重合——实现可去重也可保留，先验证至少包含这 3 个不同的点
    expect(containsPoint(pts, [0, -10])).toBe(true);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
  });

  it('全圆 0°→360°：包含 4 个基本方向', () => {
    const pts = collectArcBoundingCandidates({ center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 360 });
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
    expect(containsPoint(pts, [-10, 0])).toBe(true);
    expect(containsPoint(pts, [0, -10])).toBe(true);
  });

  it('偏移圆心 [5, 5], radius=3, 0°→180°：穿越 90°', () => {
    const pts = collectArcBoundingCandidates({ center: [5, 5], radius: 3, startAngleDeg: 0, endAngleDeg: 180 });
    expect(containsPoint(pts, [8, 5])).toBe(true); // 0°
    expect(containsPoint(pts, [5, 8])).toBe(true); // 90°
    expect(containsPoint(pts, [2, 5])).toBe(true); // 180°
  });

  it('反向 180°→0°（end<start, CW math）：等价穿越 270°', () => {
    // 从 180° 逆向到 0°，经过 90° 反方向？不——sweep 由调用者把控；
    // 此处 bounding 只关心 [start, end] 区间扫到了哪些 90°*k。
    // start=180, end=0：归一化后区间是从 180° 一路下降到 0°，扫到 90°。
    const pts = collectArcBoundingCandidates({ center: [0, 0], radius: 10, startAngleDeg: 180, endAngleDeg: 0 });
    expect(containsPoint(pts, [-10, 0])).toBe(true);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true); // 90°
  });

  it('超大角度区间仍保留四个轴向极值，不因枚举保护丢失 bounds 候选', () => {
    const pts = collectArcBoundingCandidates({
      center: [0, 0],
      radius: 10,
      startAngleDeg: 0,
      endAngleDeg: 100_000_000,
    });

    expect(pts).toHaveLength(5);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
    expect(containsPoint(pts, [-10, 0])).toBe(true);
    expect(containsPoint(pts, [0, -10])).toBe(true);
  });

  it('椭圆弧的超大角度区间同样只保留四个轴向极值', () => {
    const pts = collectEllipseArcBoundingCandidates({
      center: [0, 0],
      radiusX: 20,
      radiusY: 10,
      startAngleDeg: 0,
      endAngleDeg: 100_000_000,
    });

    expect(pts).toHaveLength(5);
    expect(containsPoint(pts, [20, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
    expect(containsPoint(pts, [-20, 0])).toBe(true);
    expect(containsPoint(pts, [0, -10])).toBe(true);
  });

  it('小于一整圈的偏移角区间不引入区间外的轴向极值', () => {
    const pts = collectArcBoundingCandidates({ center: [0, 0], radius: 10, startAngleDeg: 450, endAngleDeg: 500 });

    expect(pts).toHaveLength(2);
  });
});

describe('isAngleWithinArcSweep', () => {
  it('含端点、区间外为假、整圆恒真', () => {
    expect(isAngleWithinArcSweep({ startAngleDeg: 0, endAngleDeg: 90, angleDeg: 45 })).toBe(true);
    expect(isAngleWithinArcSweep({ startAngleDeg: 0, endAngleDeg: 90, angleDeg: 0 })).toBe(true); // 起点
    expect(isAngleWithinArcSweep({ startAngleDeg: 0, endAngleDeg: 90, angleDeg: 90 })).toBe(true); // 终点
    expect(isAngleWithinArcSweep({ startAngleDeg: 0, endAngleDeg: 90, angleDeg: 135 })).toBe(false);
    expect(isAngleWithinArcSweep({ startAngleDeg: 0, endAngleDeg: 360, angleDeg: 200 })).toBe(true); // 整圆
  });
});
