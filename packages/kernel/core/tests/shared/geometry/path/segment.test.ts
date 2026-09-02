import { describe, expect, it } from 'vitest';

import { foldSegmentSample } from '../../../../src/shared/geometry/path';

describe('foldSegmentSample', () => {
  it('t<=0.5 走第一段 (from→corner)；t>0.5 走第二段 (corner→to)', () => {
    const from: [number, number] = [0, 0];
    const corner: [number, number] = [10, 0];
    const to: [number, number] = [10, 5];
    expect(foldSegmentSample(from, corner, to, 0).point).toEqual([0, 0]);
    expect(foldSegmentSample(from, corner, to, 0.25).point).toEqual([5, 0]);
    expect(foldSegmentSample(from, corner, to, 0.5).point).toEqual([10, 0]);
    expect(foldSegmentSample(from, corner, to, 0.75).point).toEqual([10, 2.5]);
    expect(foldSegmentSample(from, corner, to, 1).point).toEqual([10, 5]);
  });

  it('t=0.25 切线沿第一段，t=0.75 沿第二段', () => {
    const from: [number, number] = [0, 0];
    const corner: [number, number] = [10, 0];
    const to: [number, number] = [10, 5];
    expect(foldSegmentSample(from, corner, to, 0.25).tangent).toEqual([1, 0]);
    expect(foldSegmentSample(from, corner, to, 0.75).tangent).toEqual([0, 1]);
  });

  it('三段平均分配 t，1/3 与 2/3 分界归前一腿', () => {
    const corners: Array<[number, number]> = [
      [3, 0],
      [3, 6],
    ];
    expect(foldSegmentSample([0, 0], corners, [9, 6], 1 / 6).point).toEqual([1.5, 0]);
    expect(foldSegmentSample([0, 0], corners, [9, 6], 1 / 3)).toEqual({
      point: [3, 0],
      tangent: [1, 0],
    });
    expect(foldSegmentSample([0, 0], corners, [9, 6], 0.5)).toEqual({
      point: [3, 3],
      tangent: [0, 1],
    });
    expect(foldSegmentSample([0, 0], corners, [9, 6], 2 / 3)).toEqual({
      point: [3, 6],
      tangent: [0, 1],
    });
    expect(foldSegmentSample([0, 0], corners, [9, 6], 5 / 6).point).toEqual([6, 6]);
  });

  it('零长腿保留常量 point，并借用最近非零腿 tangent', () => {
    expect(
      foldSegmentSample(
        [0, 0],
        [
          [0, 0],
          [0, 6],
        ],
        [9, 6],
        1 / 6,
      ),
    ).toEqual({ point: [0, 0], tangent: [0, 1] });
    expect(
      foldSegmentSample(
        [0, 0],
        [
          [3, 0],
          [3, 6],
        ],
        [3, 6],
        5 / 6,
      ),
    ).toEqual({ point: [3, 6], tangent: [0, 1] });
    expect(
      foldSegmentSample(
        [2, 2],
        [
          [2, 2],
          [2, 2],
        ],
        [2, 2],
        0.5,
      ).tangent,
    ).toEqual([1, 0]);
  });
});
