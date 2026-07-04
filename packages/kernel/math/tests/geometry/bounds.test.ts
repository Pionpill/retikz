import { describe, expect, it } from 'vitest';

import { boundsCenter, boundsCorners, boundsHalfAxes, boundsOf, expandBounds } from '../../src/geometry/bounds';

describe('bounds geometry helpers', () => {
  it('returns undefined for an empty point set', () => {
    expect(boundsOf([])).toBeUndefined();
  });

  it('computes axis-aligned min/max, center, and half axes', () => {
    const bounds = boundsOf([
      [2, -3],
      [-4, 5],
      [8, 1],
    ]);

    if (bounds === undefined) throw new Error('Expected non-empty bounds.');
    expect(bounds).toEqual({ minX: -4, minY: -3, maxX: 8, maxY: 5 });
    expect(boundsCenter(bounds)).toEqual([2, 1]);
    expect(boundsHalfAxes(bounds)).toEqual({ halfWidth: 6, halfHeight: 4 });
  });

  it('expands bounds by per-side insets', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };

    expect(expandBounds(bounds, { left: 1, right: 2, top: 3, bottom: 4 })).toEqual({
      minX: -5,
      minY: -6,
      maxX: 10,
      maxY: 9,
    });
  });

  it('returns bounds corners in stable reading order', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };

    expect(boundsCorners(bounds)).toEqual([
      [-4, -3],
      [8, -3],
      [-4, 5],
      [8, 5],
    ]);
  });
});
