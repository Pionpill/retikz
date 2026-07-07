import { describe, expect, it } from 'vitest';

import type { Position } from '../../src';

import { curve } from '../../src';

/** 一段所有坐标皆有限 */
const segmentFinite = (seg: { control1: Position; control2: Position; to: Position }): boolean =>
  [seg.control1, seg.control2, seg.to].every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));

describe('curve.catmullRomToCubic', () => {
  it('through-points：3 knot → 2 段，每段 .to 命中对应 knot', () => {
    const knots: Array<Position> = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const segs = curve.catmullRomToCubic(knots, 1);
    expect(segs).toHaveLength(knots.length - 1);
    expect(segs[0].to).toEqual(knots[1]);
    expect(segs[1].to).toEqual(knots[2]);
  });

  it('through-many-knots：5 knot → 4 段，每段 .to 命中对应 knot', () => {
    const knots: Array<Position> = [
      [0, 0],
      [10, 0],
      [10, 10],
      [20, 10],
      [20, 0],
    ];
    const segs = curve.catmullRomToCubic(knots, 1);
    expect(segs).toHaveLength(4);
    for (let i = 0; i < segs.length; i++) {
      expect(segs[i].to).toEqual(knots[i + 1]);
    }
  });

  it('tension 缩放控制点：tension=2 比 tension=1 控制点离端点更远，.to 不变', () => {
    const knots: Array<Position> = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const base = curve.catmullRomToCubic(knots, 1);
    const loose = curve.catmullRomToCubic(knots, 2);

    // .to 与 tension 无关：逐段命中同一 knot
    for (let i = 0; i < base.length; i++) {
      expect(loose[i].to).toEqual(base[i].to);
    }

    // 控制点离端点距离：tension=2 应大于 tension=1（至少一端严格变大）
    const dist = (a: Position, b: Position): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const d1Base = dist(base[0].control1, knots[0]);
    const d1Loose = dist(loose[0].control1, knots[0]);
    const d2Base = dist(base[0].control2, base[0].to);
    const d2Loose = dist(loose[0].control2, loose[0].to);
    expect(d1Loose).toBeGreaterThan(d1Base);
    expect(d2Loose).toBeGreaterThan(d2Base);
  });

  it('退化：2 knot → 1 段，.to = knots[1]', () => {
    const knots: Array<Position> = [
      [0, 0],
      [4, 3],
    ];
    const segs = curve.catmullRomToCubic(knots, 1);
    expect(segs).toHaveLength(1);
    expect(segs[0].to).toEqual(knots[1]);
    expect(segmentFinite(segs[0])).toBe(true);
  });

  it('centripetal 无 cusp：点距极不均时所有坐标有限（无 NaN/Infinity）', () => {
    const knots: Array<Position> = [
      [0, 0],
      [1, 0],
      [100, 0],
      [101, 5],
    ];
    const segs = curve.catmullRomToCubic(knots, 1);
    expect(segs).toHaveLength(3);
    for (const seg of segs) {
      expect(segmentFinite(seg)).toBe(true);
    }
  });
});
