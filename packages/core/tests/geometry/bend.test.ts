import { describe, expect, it } from 'vitest';
import { bendControlPoints } from '../../src/geometry/bend';

describe('bendControlPoints', () => {
  it("水平 chord，bend left 30° → 控制点 y 在 chord 上方（SVG y 向下，'上方' 即 y<0）", () => {
    const [c1, c2] = bendControlPoints([0, 0], [10, 0], 'left', 30);
    // 1/3 / 2/3 处控制点；offset = chord × tan(15°) × 4/3
    const offset = (10 * Math.tan((15 * Math.PI) / 180) * 4) / 3;
    expect(c1[0]).toBeCloseTo(10 / 3, 6);
    expect(c1[1]).toBeCloseTo(-offset, 6);
    expect(c2[0]).toBeCloseTo(20 / 3, 6);
    expect(c2[1]).toBeCloseTo(-offset, 6);
  });

  it("水平 chord，bend right 30° → 控制点 y 在 chord 下方（y>0）", () => {
    const [c1, c2] = bendControlPoints([0, 0], [10, 0], 'right', 30);
    const offset = (10 * Math.tan((15 * Math.PI) / 180) * 4) / 3;
    expect(c1[1]).toBeCloseTo(offset, 6);
    expect(c2[1]).toBeCloseTo(offset, 6);
  });

  it("bendAngle 0° → 控制点退化到 chord 1/3 / 2/3 上（offset = 0，等价直线）", () => {
    const [c1, c2] = bendControlPoints([0, 0], [9, 0], 'left', 0);
    expect(c1).toEqual([3, 0]);
    expect(c2).toEqual([6, 0]);
  });

  it("from === to（chord 长度为 0） → 两个控制点都返回 from（无方向可推）", () => {
    const [c1, c2] = bendControlPoints([5, 5], [5, 5], 'left', 30);
    expect(c1).toEqual([5, 5]);
    expect(c2).toEqual([5, 5]);
  });

  it("bend left vs right 关于 chord 对称", () => {
    const [c1L, c2L] = bendControlPoints([0, 0], [10, 4], 'left', 45);
    const [c1R, c2R] = bendControlPoints([0, 0], [10, 4], 'right', 45);
    // 关于 chord 中线的法向对称：left 与 right 的控制点关于 chord 互为镜像
    const mid1 = [(10 / 3) * 1, (4 / 3) * 1] as const;
    const mid2 = [(10 / 3) * 2, (4 / 3) * 2] as const;
    expect(c1L[0] - mid1[0]).toBeCloseTo(-(c1R[0] - mid1[0]), 6);
    expect(c1L[1] - mid1[1]).toBeCloseTo(-(c1R[1] - mid1[1]), 6);
    expect(c2L[0] - mid2[0]).toBeCloseTo(-(c2R[0] - mid2[0]), 6);
    expect(c2L[1] - mid2[1]).toBeCloseTo(-(c2R[1] - mid2[1]), 6);
  });
});
