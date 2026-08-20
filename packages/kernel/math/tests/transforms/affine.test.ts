import { describe, expect, it } from 'vitest';

import type { AffineMatrix, Position } from '../../src';

import {
  AFFINE_IDENTITY,
  applyAffine,
  getAffineSimilarityScale,
  isFiniteNonSingularAffine,
  multiplyAffine,
} from '../../src';

describe('二维仿射矩阵原子', () => {
  it('提供运行时不可变的 SVG / Canvas 单位矩阵', () => {
    expect(AFFINE_IDENTITY).toEqual([1, 0, 0, 1, 0, 0]);
    expect(Object.isFrozen(AFFINE_IDENTITY)).toBe(true);

    expect(() => {
      (AFFINE_IDENTITY as unknown as Array<number>)[0] = 2;
    }).toThrow(TypeError);
    expect(AFFINE_IDENTITY).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('左右单位元保持数值，并返回调用方独占的新 tuple', () => {
    const matrix: AffineMatrix = [2, 3, 5, 7, 11, 13];

    const left = multiplyAffine(AFFINE_IDENTITY, matrix);
    const right = multiplyAffine(matrix, AFFINE_IDENTITY);

    expect(left).toEqual(matrix);
    expect(right).toEqual(matrix);
    expect(left).not.toBe(matrix);
    expect(right).not.toBe(matrix);
    expect(matrix).toEqual([2, 3, 5, 7, 11, 13]);
  });

  it('按 outer × inner 复合，先应用 inner 且保持非交换性', () => {
    const translate: AffineMatrix = [1, 0, 0, 1, 10, 20];
    const scale: AffineMatrix = [2, 0, 0, 3, 0, 0];

    expect(multiplyAffine(translate, scale)).toEqual([2, 0, 0, 3, 10, 20]);
    expect(multiplyAffine(scale, translate)).toEqual([2, 0, 0, 3, 20, 60]);
    expect(translate).toEqual([1, 0, 0, 1, 10, 20]);
    expect(scale).toEqual([2, 0, 0, 3, 0, 0]);
  });

  it('复合旋转与负缩放时保留 SVG 坐标方向', () => {
    const rotateQuarterTurn: AffineMatrix = [0, 1, -1, 0, 0, 0];
    const flipY: AffineMatrix = [1, 0, 0, -1, 0, 0];

    const matrix = multiplyAffine(rotateQuarterTurn, flipY);

    expect(matrix).toEqual([0, 1, 1, 0, 0, 0]);
    expect(applyAffine(matrix, [2, 3])).toEqual([3, 2]);
  });

  it('按六元组公式映射点，并不修改矩阵或输入点', () => {
    const matrix: AffineMatrix = [2, 3, 5, 7, 11, 13];
    const input: Position = [17, 19];

    const output = applyAffine(matrix, input);

    expect(output).toEqual([140, 197]);
    expect(output).not.toBe(input);
    expect(matrix).toEqual([2, 3, 5, 7, 11, 13]);
    expect(input).toEqual([17, 19]);
  });

  it('判断仿射矩阵的有限性与非奇异性', () => {
    expect(isFiniteNonSingularAffine([2, 0, 0, 3, 10, 20])).toBe(true);
    expect(isFiniteNonSingularAffine([1, 2, 2, 4, 0, 0])).toBe(false);
    expect(isFiniteNonSingularAffine([Number.NaN, 0, 0, 1, 0, 0])).toBe(false);
    expect(isFiniteNonSingularAffine([1, 0, 0, 1e-13, 0, 0])).toBe(false);
  });

  it('返回仿射相似变换的统一缩放因子', () => {
    expect(getAffineSimilarityScale([2, 0, 0, -2, 10, 20])).toBe(2);
    expect(getAffineSimilarityScale([0, 3, -3, 0, 0, 0])).toBe(3);
    expect(getAffineSimilarityScale([2, 0, 0, 3, 0, 0])).toBeUndefined();
    expect(getAffineSimilarityScale([1, 2, 2, 4, 0, 0])).toBeUndefined();
  });
});
