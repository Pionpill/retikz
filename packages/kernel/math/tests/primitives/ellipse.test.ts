import { describe, expect, it } from 'vitest';

import { ellipse } from '../../src';

describe('ellipse geometry helpers', () => {
  it('inscribedInBox returns the centered ellipse inside a box', () => {
    expect(ellipse.inscribedInBox({ x: 2, y: 3, width: 20, height: 10, rotate: Math.PI / 6 })).toEqual({
      x: 2,
      y: 3,
      rx: 10,
      ry: 5,
      rotate: Math.PI / 6,
    });
  });

  it('circumscribedHalfAxes supports proportional ellipse and equal circle modes', () => {
    expect(ellipse.circumscribedHalfAxes({ halfWidth: 10, halfHeight: 6 })).toEqual({
      halfWidth: 10 * Math.SQRT2,
      halfHeight: 6 * Math.SQRT2,
    });

    const r = Math.hypot(10, 6);
    expect(ellipse.circumscribedHalfAxes({ halfWidth: 10, halfHeight: 6 }, 'equal')).toEqual({
      halfWidth: r,
      halfHeight: r,
    });
  });

  it('boundaryPoint projects a center ray onto the ellipse', () => {
    expect(ellipse.boundaryPoint({ x: 0, y: 0, rx: 10, ry: 5 }, [100, 0])).toEqual([10, 0]);
    expect(ellipse.boundaryPoint({ x: 0, y: 0, rx: 10, ry: 5 }, [0, 100])).toEqual([0, 5]);
  });
});
