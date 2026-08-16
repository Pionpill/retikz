import { describe, expect, it } from 'vitest';

import { triangle } from '../../src';

describe('triangle', () => {
  it('circumCircle：直角三角形外心 = 斜边中点', () => {
    const c = triangle.circumCircle([0, 0], [4, 0], [0, 3]);
    expect(c).not.toBeNull();
    expect(c!.center[0]).toBeCloseTo(2, 9);
    expect(c!.center[1]).toBeCloseTo(1.5, 9);
    expect(c!.radius).toBeCloseTo(2.5, 9);
  });
  it('circumCircle：共线退化返回 null', () => {
    expect(triangle.circumCircle([0, 0], [1, 1], [2, 2])).toBeNull();
  });
  it('inCircle：内切圆 r = area / s', () => {
    const c = triangle.inCircle([0, 0], [4, 0], [0, 4]);
    expect(c).not.toBeNull();
    const r = 8 / ((4 + 4 + Math.hypot(4, 4)) / 2);
    expect(c!.radius).toBeCloseTo(r, 9);
    expect(c!.center[0]).toBeCloseTo(r, 9);
    expect(c!.center[1]).toBeCloseTo(r, 9);
  });
  it('inCircle：共线退化返回 null', () => {
    expect(triangle.inCircle([0, 0], [1, 0], [2, 0])).toBeNull();
  });
});
