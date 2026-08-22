import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  boundsToRect,
  centerOfBounds,
  cornersOfBounds,
  expandBounds,
  halfAxesOfBounds,
  isFiniteBoundsRect,
  isPositiveBoundsRect,
  mergeBounds,
  rectToBounds,
} from '../../src';

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
    expect(centerOfBounds(bounds)).toEqual([2, 1]);
    expect(halfAxesOfBounds(bounds)).toEqual({ halfWidth: 6, halfHeight: 4 });
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

    expect(cornersOfBounds(bounds)).toEqual([
      [-4, -3],
      [8, -3],
      [-4, 5],
      [8, 5],
    ]);
  });

  it('merges empty and non-empty bounds', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };

    expect(mergeBounds(undefined, undefined)).toBeUndefined();
    expect(mergeBounds(undefined, bounds)).toEqual(bounds);
    expect(mergeBounds(bounds, undefined)).toEqual(bounds);
    expect(mergeBounds(bounds, { minX: -10, minY: 0, maxX: 2, maxY: 9 })).toEqual({
      minX: -10,
      minY: -3,
      maxX: 8,
      maxY: 9,
    });
  });

  it('returns copies when one side is empty', () => {
    const bounds = { minX: 1, minY: 2, maxX: 3, maxY: 4 };
    const fromLeftEmpty = mergeBounds(undefined, bounds);
    const fromRightEmpty = mergeBounds(bounds, undefined);
    if (fromLeftEmpty === undefined || fromRightEmpty === undefined) throw new Error('Expected merged bounds.');

    fromLeftEmpty.minX = -999;
    fromRightEmpty.maxX = 999;

    expect(bounds).toEqual({ minX: 1, minY: 2, maxX: 3, maxY: 4 });
  });

  it('converts between axis-aligned bounds and top-left bounds rects', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };
    const rect = { x: -4, y: -3, width: 12, height: 8 };

    expect(boundsToRect(bounds)).toEqual(rect);
    expect(rectToBounds(rect)).toEqual(bounds);
  });

  it('classifies finite and positive bounds rects', () => {
    expect(isFiniteBoundsRect({ x: 0, y: 1, width: 2, height: 3 })).toBe(true);
    expect(isFiniteBoundsRect({ x: 0, y: 1, width: Infinity, height: 3 })).toBe(false);
    expect(isPositiveBoundsRect({ x: 0, y: 1, width: 2, height: 3 })).toBe(true);
    expect(isPositiveBoundsRect({ x: 0, y: 1, width: 0, height: 3 })).toBe(false);
  });
});
