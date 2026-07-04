import { describe, expect, it } from 'vitest';

import { boundsCenter, boundsHalfAxes, boundsOf } from '../../src/geometry/bounds';

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
});
