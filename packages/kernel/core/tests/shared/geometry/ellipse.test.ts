import type { Ellipse } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { Anchor } from '../../../src/shared';
import { ellipse } from '../../../src/shared/geometry/ellipse';

const e: Ellipse = { x: 0, y: 0, rx: 10, ry: 5 };

describe('ellipse.anchor', () => {
  it('4 轴端点对应 N / S / E / W', () => {
    expect(ellipse.anchor(e, Anchor.Right)).toEqual([10, 0]);
    expect(ellipse.anchor(e, Anchor.Left)).toEqual([-10, 0]);
    expect(ellipse.anchor(e, Anchor.Top)).toEqual([0, -5]);
    expect(ellipse.anchor(e, Anchor.Bottom)).toEqual([0, 5]);
  });

  it('对角 anchor 取参数 t=π/4 处：(rx/√2, ry/√2)', () => {
    const ne = ellipse.anchor(e, Anchor.TopRight);

    expect(ne[0]).toBeCloseTo(10 * Math.SQRT1_2);
    expect(ne[1]).toBeCloseTo(-5 * Math.SQRT1_2);
  });
});
