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

describe('边界几何帮助器', () => {
  it('对于空点集返回 undefined', () => {
    expect(boundsOf([])).toBeUndefined();
  });

  it('计算轴对齐的最小/最大、中心轴和半轴', () => {
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

  it('通过每边插入扩展边界', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };

    expect(expandBounds(bounds, { left: 1, right: 2, top: 3, bottom: 4 })).toEqual({
      minX: -5,
      minY: -6,
      maxX: 10,
      maxY: 9,
    });
  });

  it('以稳定的读取顺序返回边界角', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };

    expect(cornersOfBounds(bounds)).toEqual([
      [-4, -3],
      [8, -3],
      [-4, 5],
      [8, 5],
    ]);
  });

  it('合并空和非空边界', () => {
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

  it('当一侧为空时返回副本', () => {
    const bounds = { minX: 1, minY: 2, maxX: 3, maxY: 4 };
    const fromLeftEmpty = mergeBounds(undefined, bounds);
    const fromRightEmpty = mergeBounds(bounds, undefined);
    if (fromLeftEmpty === undefined || fromRightEmpty === undefined) throw new Error('Expected merged bounds.');

    fromLeftEmpty.minX = -999;
    fromRightEmpty.maxX = 999;

    expect(bounds).toEqual({ minX: 1, minY: 2, maxX: 3, maxY: 4 });
  });

  it('在轴对齐边界和左上角边界矩形之间转换', () => {
    const bounds = { minX: -4, minY: -3, maxX: 8, maxY: 5 };
    const rect = { x: -4, y: -3, width: 12, height: 8 };

    expect(boundsToRect(bounds)).toEqual(rect);
    expect(rectToBounds(rect)).toEqual(bounds);
  });

  it('对有限和正界矩形进行分类', () => {
    expect(isFiniteBoundsRect({ x: 0, y: 1, width: 2, height: 3 })).toBe(true);
    expect(isFiniteBoundsRect({ x: 0, y: 1, width: Infinity, height: 3 })).toBe(false);
    expect(isPositiveBoundsRect({ x: 0, y: 1, width: 2, height: 3 })).toBe(true);
    expect(isPositiveBoundsRect({ x: 0, y: 1, width: 0, height: 3 })).toBe(false);
  });
});
