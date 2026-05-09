import { describe, expect, it } from 'vitest';
import {
  arcBoundingPoints,
  arcEndPoint,
  arcSvgFlags,
} from '../../src/geometry/arc';

/*
 * 约定（与 polar.ts 一致）：
 *   endpoint = [cx + r·cos(θ), cy + r·sin(θ)]   // y 不翻转，沿用 SVG y-down
 *   - angle=0   → +x（east）
 *   - angle=90  → +y（在 SVG 上视觉为下，即 "south"）
 *   - angle=180 → -x（west）
 *   - angle=270 → -y（在 SVG 上视觉为上，即 "north"）
 */

describe('arcEndPoint 圆周点投影', () => {
  it('center=[0,0], radius=10, angle=0 → [10, 0]', () => {
    const [x, y] = arcEndPoint([0, 0], 10, 0);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(0);
  });

  it('center=[0,0], radius=10, angle=90 → [0, 10]（与 polar.toPosition 同约定）', () => {
    const [x, y] = arcEndPoint([0, 0], 10, 90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
  });

  it('center=[0,0], radius=10, angle=180 → [-10, 0]', () => {
    const [x, y] = arcEndPoint([0, 0], 10, 180);
    expect(x).toBeCloseTo(-10);
    expect(y).toBeCloseTo(0);
  });

  it('center=[0,0], radius=10, angle=270 → [0, -10]', () => {
    const [x, y] = arcEndPoint([0, 0], 10, 270);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-10);
  });

  it('angle=360 与 angle=0 同点', () => {
    const a = arcEndPoint([0, 0], 10, 360);
    const b = arcEndPoint([0, 0], 10, 0);
    expect(a[0]).toBeCloseTo(b[0]);
    expect(a[1]).toBeCloseTo(b[1]);
  });

  it('center=[5, 5], radius=3, angle=0 → [8, 5]', () => {
    const [x, y] = arcEndPoint([5, 5], 3, 0);
    expect(x).toBeCloseTo(8);
    expect(y).toBeCloseTo(5);
  });

  it('负角度 angle=-90 等价 270 → [0, -10]', () => {
    const [x, y] = arcEndPoint([0, 0], 10, -90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-10);
  });
});

describe('arcSvgFlags large-arc / sweep 计算', () => {
  it('小弧 0°→90°：largeArc=0, sweep=1（端角增加）', () => {
    expect(arcSvgFlags(0, 90)).toEqual({ largeArc: 0, sweep: 1 });
  });

  it('恰好半弧 0°→180°：largeArc=0（边界，按 |Δ|>180 判定）, sweep=1', () => {
    expect(arcSvgFlags(0, 180)).toEqual({ largeArc: 0, sweep: 1 });
  });

  it('大弧 0°→270°：largeArc=1, sweep=1', () => {
    expect(arcSvgFlags(0, 270)).toEqual({ largeArc: 1, sweep: 1 });
  });

  it('反向小弧 90°→0°：endAngle < startAngle → sweep=0', () => {
    expect(arcSvgFlags(90, 0)).toEqual({ largeArc: 0, sweep: 0 });
  });

  it('反向大弧 270°→0°：|Δ|=270>180 → largeArc=1, sweep=0', () => {
    expect(arcSvgFlags(270, 0)).toEqual({ largeArc: 1, sweep: 0 });
  });

  it('完整一圈 0°→360°：|Δ|=360>180 → largeArc=1, sweep=1', () => {
    expect(arcSvgFlags(0, 360)).toEqual({ largeArc: 1, sweep: 1 });
  });
});

describe('arcBoundingPoints 弧 bbox 极值候选点', () => {
  // 工具：粗略验证某点是否在结果集合里
  const containsPoint = (
    list: Array<[number, number]>,
    target: [number, number],
    eps = 1e-9,
  ): boolean =>
    list.some(
      ([x, y]) =>
        Math.abs(x - target[0]) < eps && Math.abs(y - target[1]) < eps,
    );

  it('0°→90° 无穿越基本方向：仅返回端点', () => {
    const pts = arcBoundingPoints([0, 0], 10, 0, 90);
    // 起点 [10, 0]、终点 [0, 10]，不应再有其它点
    expect(pts.length).toBe(2);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
  });

  it('0°→180° 穿越 90°：含三个点（起点、90°、终点）', () => {
    const pts = arcBoundingPoints([0, 0], 10, 0, 180);
    expect(pts.length).toBe(3);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true); // 90° 投影
    expect(containsPoint(pts, [-10, 0])).toBe(true);
  });

  it('270°→90°（CCW 跨 360°）：穿越 0° 与 90°', () => {
    // 270° 起点 = [0, -10]；穿过 360°(=0°) → [10, 0]；再到 90° → [0, 10]
    const pts = arcBoundingPoints([0, 0], 10, 270, 450);
    // 起点 [0, -10], 0° → [10, 0], 90° → [0, 10], 终点（450°=90°）= [0, 10]
    // 终点与 90° 重合——实现可去重也可保留，先验证至少包含这 3 个不同的点
    expect(containsPoint(pts, [0, -10])).toBe(true);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
  });

  it('全圆 0°→360°：包含 4 个基本方向', () => {
    const pts = arcBoundingPoints([0, 0], 10, 0, 360);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true);
    expect(containsPoint(pts, [-10, 0])).toBe(true);
    expect(containsPoint(pts, [0, -10])).toBe(true);
  });

  it('偏移圆心 [5, 5], radius=3, 0°→180°：穿越 90°', () => {
    const pts = arcBoundingPoints([5, 5], 3, 0, 180);
    expect(containsPoint(pts, [8, 5])).toBe(true); // 0°
    expect(containsPoint(pts, [5, 8])).toBe(true); // 90°
    expect(containsPoint(pts, [2, 5])).toBe(true); // 180°
  });

  it('反向 180°→0°（end<start, CW math）：等价穿越 270°', () => {
    // 从 180° 逆向到 0°，经过 90° 反方向？不——sweep 由调用者把控；
    // 此处 bounding 只关心 [start, end] 区间扫到了哪些 90°*k。
    // start=180, end=0：归一化后区间是从 180° 一路下降到 0°，扫到 90°。
    const pts = arcBoundingPoints([0, 0], 10, 180, 0);
    expect(containsPoint(pts, [-10, 0])).toBe(true);
    expect(containsPoint(pts, [10, 0])).toBe(true);
    expect(containsPoint(pts, [0, 10])).toBe(true); // 90°
  });
});
