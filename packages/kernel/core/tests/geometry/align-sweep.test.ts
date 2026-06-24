import { describe, expect, it } from 'vitest';
import { alignSweep } from '../../src/geometry/contour';

/*
 * alignSweep 把 (start, end) 调整成沿给定扫描方向（ccw=true 递减 / 否则递增）表达，
 * 保持裁剪后弧方向不变。以下用例钉住当前实现在 sweep 恰为 0 / ±360 / 接近但不等于
 * 这些值时的行为（回归锁定，不是规范主张）。
 *
 * 当前实现要点：
 *   - sweep === 0（严格相等）→ { start, end: start }
 *   - Math.abs(sweep) === 360（严格相等）→ end = start ± 360（按 ccw）
 *   - 其余走归一化：normalized = ((sweep%360)+360)%360
 *       CW : end = start + (normalized===0 ? 360 : normalized)
 *       CCW: end = start + (normalized===0 ? -360 : normalized-360)
 */

describe('alignSweep sweep 恰为 0', () => {
  it('start===end（CW）→ 退化为零跨度，end 不变', () => {
    const r = alignSweep(40, 40, false);
    expect(r.start).toBe(40);
    expect(r.end).toBe(40);
  });

  it('start===end（CCW）→ 同样退化为零跨度', () => {
    const r = alignSweep(40, 40, true);
    expect(r.start).toBe(40);
    expect(r.end).toBe(40);
  });
});

describe('alignSweep sweep 恰为 ±360', () => {
  it('end−start === 360（CW）→ 保留整圈 +360', () => {
    const r = alignSweep(0, 360, false);
    expect(r.start).toBe(0);
    expect(r.end).toBe(360);
  });

  it('end−start === 360（CCW）→ 翻成 −360 整圈', () => {
    const r = alignSweep(0, 360, true);
    expect(r.start).toBe(0);
    expect(r.end).toBe(-360);
  });

  it('end−start === −360（CW）→ 翻成 +360 整圈', () => {
    const r = alignSweep(360, 0, false);
    expect(r.start).toBe(360);
    expect(r.end).toBe(720);
  });

  it('end−start === −360（CCW）→ 保留 −360 整圈', () => {
    const r = alignSweep(360, 0, true);
    expect(r.start).toBe(360);
    expect(r.end).toBe(0);
  });
});

describe('alignSweep 接近但不等于 360 / 0', () => {
  it('sweep 略小于 360（CW）→ 走归一化，得到接近 360 的正向跨度', () => {
    const eps = 1e-9;
    const r = alignSweep(0, 360 - eps, false);
    expect(r.start).toBe(0);
    // 不命中 ===360 分支，normalized = 360 − eps（≠0），保持原跨度
    expect(r.end).toBeCloseTo(360 - eps, 12);
    expect(r.end - r.start).toBeGreaterThan(0);
    expect(r.end - r.start).toBeLessThan(360);
  });

  it('sweep 略大于 360（CW）→ 归一化回落到接近 0 的小正跨度', () => {
    const eps = 1e-9;
    const r = alignSweep(0, 360 + eps, false);
    expect(r.start).toBe(0);
    // normalized = (360+eps) % 360 ≈ eps，仍 ≠0，取该小正跨度
    expect(r.end).toBeCloseTo(eps, 12);
    expect(r.end - r.start).toBeGreaterThan(0);
    expect(r.end - r.start).toBeLessThan(1);
  });

  it('sweep 略小于 360（CCW）→ 归一化成接近 0 的小负跨度', () => {
    const eps = 1e-9;
    const r = alignSweep(0, 360 - eps, true);
    expect(r.start).toBe(0);
    // normalized ≈ 360 − eps，CCW → normalized − 360 ≈ −eps
    expect(r.end).toBeCloseTo(-eps, 12);
    expect(r.end - r.start).toBeLessThan(0);
    expect(r.end - r.start).toBeGreaterThan(-1);
  });

  it('sweep 略大于 0（CW）→ 保持原小正跨度', () => {
    const eps = 1e-9;
    const r = alignSweep(10, 10 + eps, false);
    expect(r.start).toBe(10);
    expect(r.end).toBeCloseTo(10 + eps, 12);
  });

  it('sweep 略小于 0（CW）→ 归一化翻成接近 360 的正跨度', () => {
    const eps = 1e-9;
    const r = alignSweep(10, 10 - eps, false);
    expect(r.start).toBe(10);
    // normalized = ((−eps)%360 + 360)%360 ≈ 360 − eps
    expect(r.end).toBeCloseTo(10 + (360 - eps), 9);
    expect(r.end - r.start).toBeGreaterThan(359);
  });
});

describe('alignSweep 一般中间跨度方向归一化', () => {
  it('CW 把负跨度翻成正向小弧', () => {
    const r = alignSweep(350, 10, false);
    // sweep = −340 → normalized = 20，CW 取 +20
    expect(r.start).toBe(350);
    expect(r.end).toBeCloseTo(370, 9);
  });

  it('CCW 把正跨度翻成负向小弧', () => {
    const r = alignSweep(10, 350, true);
    // sweep = 340 → normalized = 340，CCW → 340 − 360 = −20
    expect(r.start).toBe(10);
    expect(r.end).toBeCloseTo(-10, 9);
  });
});
