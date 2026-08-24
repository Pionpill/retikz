import { describe, expect, it } from 'vitest';

import type { Position, Vector2 } from '../../src';

import { isFiniteNumber, isFinitePoint, isInfiniteNumber, lerp, point, vector2 } from '../../src';

describe('point / vector2 原语', () => {
  it('区分 finite / infinite number', () => {
    expect(isFiniteNumber(1)).toBe(true);
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber('1')).toBe(false);

    expect(isInfiniteNumber(Infinity)).toBe(true);
    expect(isInfiniteNumber(-Infinity)).toBe(true);
    expect(isInfiniteNumber(NaN)).toBe(false);
    expect(isInfiniteNumber(1)).toBe(false);
  });

  it('isFinitePoint 只接受精确二维 finite 元组', () => {
    expect(isFinitePoint([1, 2])).toBe(true);
    expect(isFinitePoint([1, 2, 3])).toBe(false);
    expect(isFinitePoint([Number.NaN, 2])).toBe(false);
    expect(isFinitePoint([1, Infinity])).toBe(false);
  });

  it('add / sub / scale', () => {
    expect(vector2.add([1, 2], [3, 4])).toEqual([4, 6]);
    expect(vector2.sub([3, 4], [1, 2])).toEqual([2, 2]);
    expect(vector2.scale([1, 2], 3)).toEqual([3, 6]);
  });
  it('length / normalize 零向量回退 fallback', () => {
    expect(vector2.length([3, 4])).toBe(5);
    expect(vector2.normalize([0, 0], [1, 0])).toEqual([1, 0]);
    expect(vector2.normalize([0, 5])).toEqual([0, 1]);
  });
  it('dot / cross', () => {
    expect(vector2.dot([1, 2], [3, 4])).toBe(11);
    expect(vector2.cross([1, 0], [0, 1])).toBe(1);
  });
  it('equal 精确相等', () => {
    expect(point.isEqual([1, 2], [1, 2])).toBe(true);
    expect(point.isEqual([1, 2], [1, 3])).toBe(false);
  });
  it('shiftToward 沿方向移动 dist', () => {
    expect(point.shiftToward([0, 0], [10, 0], 3)).toEqual([3, 0]);
    expect(point.shiftToward([0, 0], [0, 0], 3)).toEqual([0, 0]);
  });
  it('Vector2 与 Position 共享 tuple 表示', () => {
    const p: Position = [0, 5];
    const v: Vector2 = p;
    expect(v).toEqual([0, 5]);
    expect(vector2.fromAngleDegrees(90)[0]).toBeCloseTo(0);
    expect(vector2.fromAngleDegrees(90)[1]).toBeCloseTo(1);
    expect(vector2.normalize([0, 5])).toEqual([0, 1]);
  });
  it('lerp 线性插值（含 t=0/t=1 端点）', () => {
    const r: Position = lerp([0, 0], [10, 20], 0.5);
    expect(r).toEqual([5, 10]);
    expect(lerp([2, 3], [10, 20], 0)).toEqual([2, 3]); // t=0 → a
    expect(lerp([2, 3], [10, 20], 1)).toEqual([10, 20]); // t=1 → b
  });
});
