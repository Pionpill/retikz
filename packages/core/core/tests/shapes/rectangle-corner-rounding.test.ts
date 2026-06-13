/**
 * rectangle cornerRadius（统一圆角）—— boundaryPoint 走 rounded-contour（连接感知倒角）+ r=0 等价 + emit 仍 RectPrim
 * @description 覆盖：
 *   - rect_emit_stays_rectprim：emit 仍出 RectPrim（含 cornerRadius 字段），非 path；
 *   - rect_boundary_aware：朝角方向 cornerRadius>0 boundaryPoint 落 fillet 弧（≠ 直角顶点）、r=0 = 直角；
 *   - rect_r0_boundary_equiv：省略 cornerRadius boundaryPoint 多方向 = 现状矩形边求交（rect.boundaryPoint 数学）；
 *   - rect_params_over_toplevel：params.cornerRadius 优先于顶层（经 style）回退。
 *
 *   boundaryPoint 把矩形 4 角构造成 4 条折线段、委托 boundaryFromContour，rayOrigin = 矩形中心；
 *   r=0 / 省略时与现状矩形边射线求交（geometry/rect.boundaryPoint）逐数值等价。
 */
import { describe, expect, it } from 'vitest';
import { rectangle } from '../../src/shapes';
import type { Rect } from '../../src/shapes';
import { rect as rectOps } from '../../src/geometry/rect';
import type { Position } from '../../src/geometry/point';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const identity = (n: number): number => n;

const aaRect = (width = 120, height = 80): Rect => ({ x: 0, y: 0, width, height, rotate: 0 });

describe('rectangle cornerRadius — emit 仍 RectPrim', () => {
  it('rect_emit_stays_rectprim：emit 出 RectPrim（含 cornerRadius），非 path', () => {
    const rect = aaRect();
    const prims = [...rectangle.emit(rect, { cornerRadius: 10 }, round2, { cornerRadius: 8 })];
    expect(prims.length).toBe(1);
    const prim = prims[0];
    expect(prim.type).toBe('rect');
    if (prim.type !== 'rect') throw new Error('expected rect');
    // params.cornerRadius 优先于 style（顶层迁移回退）
    expect(prim.cornerRadius).toBe(8);
  });

  it('rect_emit_no_cornerRadius：省略 → cornerRadius 字段 undefined（仍 RectPrim）', () => {
    const rect = aaRect();
    const prims = [...rectangle.emit(rect, {}, round2, {})];
    const prim = prims[0];
    expect(prim.type).toBe('rect');
    if (prim.type !== 'rect') throw new Error('expected rect');
    expect(prim.cornerRadius).toBeUndefined();
  });
});

describe('rectangle cornerRadius — boundary aware', () => {
  it('rect_boundary_aware：朝角方向 r>0 落 fillet 弧（≠ 直角顶点），r=0 = 直角顶点', () => {
    const rect = aaRect(120, 120); // 正方形：朝 [1,1] 方向命中右下角
    const toward: Position = [1000, 1000];
    const sharp = rectangle.boundaryPoint(rect, toward, {});
    const rounded = rectangle.boundaryPoint(rect, toward, { cornerRadius: 24 });
    // 直角顶点离中心最远（半对角线）；倒角后该方向边界更靠近中心
    const distSharp = Math.hypot(sharp[0], sharp[1]);
    const distRounded = Math.hypot(rounded[0], rounded[1]);
    expect(distRounded).toBeLessThan(distSharp - 1e-6);
    // r=0 命中正方形右下角 (60, 60)
    expect(sharp[0]).toBeCloseTo(60, 6);
    expect(sharp[1]).toBeCloseTo(60, 6);
  });

  it('rect_boundary_aware_edge_unchanged：朝边中点方向（非角）r>0 与 r=0 相同（边未被倒角影响）', () => {
    const rect = aaRect(120, 80);
    const toward: Position = [1000, 0]; // 朝 +x 边中点
    const sharp = rectangle.boundaryPoint(rect, toward, {});
    const rounded = rectangle.boundaryPoint(rect, toward, { cornerRadius: 10 });
    expect(rounded[0]).toBeCloseTo(sharp[0], 6);
    expect(rounded[1]).toBeCloseTo(sharp[1], 6);
    expect(sharp[0]).toBeCloseTo(60, 6); // 右边 x = halfWidth
  });
});

describe('rectangle cornerRadius — r=0 等价于现状矩形边求交', () => {
  // 现状参考：geometry/rect.boundaryPoint（中心 → toward 射线 ∩ 矩形边，含旋转）。
  const towards: Array<Position> = [
    [1000, 0],
    [0, 1000],
    [-1000, 0],
    [0, -1000],
    [300, 130],
    [-220, 410],
    [137, -512],
    [-640, -90],
  ];

  it('rect_r0_boundary_equiv：省略 cornerRadius 多方向 = rect.boundaryPoint', () => {
    const rect = aaRect(120, 80);
    for (const toward of towards) {
      const expected = rectOps.boundaryPoint(rect, toward);
      const got = rectangle.boundaryPoint(rect, toward, {});
      expect(got[0]).toBeCloseTo(expected[0], 9);
      expect(got[1]).toBeCloseTo(expected[1], 9);
    }
  });

  it('rect_r0_boundary_equiv_zero：cornerRadius:0 与省略一致', () => {
    const rect = aaRect(120, 80);
    for (const toward of towards) {
      const omitted = rectangle.boundaryPoint(rect, toward, {});
      const zero = rectangle.boundaryPoint(rect, toward, { cornerRadius: 0 });
      expect(zero[0]).toBeCloseTo(omitted[0], 9);
      expect(zero[1]).toBeCloseTo(omitted[1], 9);
    }
  });

  it('rect_r0_boundary_equiv_rotated：带 rotate 的 rect 下省略 cornerRadius 仍 = rect.boundaryPoint', () => {
    const rect: Rect = { x: 10, y: -5, width: 120, height: 80, rotate: 0.6 };
    for (const toward of towards) {
      const expected = rectOps.boundaryPoint(rect, toward);
      const got = rectangle.boundaryPoint(rect, toward, {});
      expect(got[0]).toBeCloseTo(expected[0], 9);
      expect(got[1]).toBeCloseTo(expected[1], 9);
    }
  });
});

describe('rectangle cornerRadius — scaleParams / paramsSchema', () => {
  it('rect_scaleParams_corner：scale=2 → cornerRadius×2', () => {
    expect(rectangle.scaleParams!({ cornerRadius: 6 }, 2, 2)).toEqual({ cornerRadius: 12 });
    expect(rectangle.scaleParams!({}, 2, 2)).toEqual({});
  });

  it('negative_cornerRadius_rejected', () => {
    expect(() => rectangle.paramsSchema.parse({ cornerRadius: -3 })).toThrow();
  });

  it('non_finite_cornerRadius_rejected', () => {
    expect(() => rectangle.paramsSchema.parse({ cornerRadius: Infinity })).toThrow();
    expect(() => rectangle.paramsSchema.parse({ cornerRadius: NaN })).toThrow();
  });

  // round 时机：identity round 下 emit cornerRadius 原样
  it('rect_emit_round_identity：identity round 下 emit cornerRadius 原样', () => {
    const prims = [...rectangle.emit(aaRect(), {}, identity, { cornerRadius: 7.5 })];
    const prim = prims[0];
    if (prim.type !== 'rect') throw new Error('expected rect');
    expect(prim.cornerRadius).toBe(7.5);
  });
});
