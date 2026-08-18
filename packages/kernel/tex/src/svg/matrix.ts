import type { ValueOf } from '@retikz/foundation';
import type { AffineMatrix } from '@retikz/math';

import { RetikzError } from '@retikz/foundation';
import { AFFINE_IDENTITY, multiplyAffine } from '@retikz/math';

/** 矩阵是否为有限且非奇异的仿射变换 */
export const isFiniteNonSingular = (matrix: AffineMatrix): boolean => {
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  return matrix.every(Number.isFinite) && Number.isFinite(determinant) && Math.abs(determinant) > 1e-12;
};

/** 返回 similarity transform 的统一缩放；其它矩阵返回 undefined */
export const similarityScale = (matrix: AffineMatrix): number | undefined => {
  if (!isFiniteNonSingular(matrix)) return undefined;
  const firstLength = Math.hypot(matrix[0], matrix[1]);
  const secondLength = Math.hypot(matrix[2], matrix[3]);
  const dot = matrix[0] * matrix[2] + matrix[1] * matrix[3];
  const tolerance = 1e-9 * Math.max(1, firstLength, secondLength);
  if (Math.abs(firstLength - secondLength) > tolerance || Math.abs(dot) > tolerance) return undefined;
  return firstLength;
};

/** SVG transform 解析错误码 */
export const RetikzSvgTransformErrorCode = {
  /** 当前 transform 能力不受支持 */
  Unsupported: 'unsupported',
  /** transform 输入格式无效 */
  Malformed: 'malformed',
} as const;

/** SVG transform 解析错误码取值 */
export type RetikzSvgTransformErrorCodeValue = ValueOf<typeof RetikzSvgTransformErrorCode>;

/** SVG transform 解析失败，并保留未支持能力与非法输入的分类 */
export class RetikzSvgTransformError extends RetikzError<
  RetikzSvgTransformErrorCodeValue,
  Readonly<{ kind: RetikzSvgTransformErrorCodeValue }>
> {
  /** 失败分类 */
  readonly kind: RetikzSvgTransformErrorCodeValue;

  constructor(kind: RetikzSvgTransformErrorCodeValue, message: string) {
    super({ code: kind, message, details: { kind } });
    this.kind = kind;
  }
}

/**
 * 解析 SVG `transform` 属性值为单一矩阵（支持 translate / scale / matrix，按出现顺序左乘累积）
 * @description MathJax SVG 仅用 `scale(1,-1)`（全局 y 翻转）+ `translate(x,y)`（字形偏移）；matrix 一并支持兜底。
 *   无 / 空 → 单位阵。未知函数或 malformed 参数会抛错，由上层降级为 null，避免静默错位
 */
export const parseTransform = (value: string | undefined): AffineMatrix => {
  const source = value?.trim();
  if (!source) return AFFINE_IDENTITY;
  let matrix: AffineMatrix = AFFINE_IDENTITY;
  const re = /([a-zA-Z][\w-]*)\s*\(([^)]*)\)/g;
  let hit: RegExpExecArray | null;
  let cursor = 0;
  while ((hit = re.exec(source)) !== null) {
    if (source.slice(cursor, hit.index).trim().length > 0) {
      throw new RetikzSvgTransformError(
        RetikzSvgTransformErrorCode.Malformed,
        `Malformed SVG transform syntax: ${source}`,
      );
    }
    const fn = hit[1];
    const args = hit[2]
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(Number);
    if (args.some(arg => !Number.isFinite(arg))) {
      throw new RetikzSvgTransformError(
        RetikzSvgTransformErrorCode.Malformed,
        `Invalid SVG transform argument: ${hit[0]}`,
      );
    }
    let local: AffineMatrix;
    if (fn === 'translate') {
      if (args.length < 1 || args.length > 2)
        throw new RetikzSvgTransformError(
          RetikzSvgTransformErrorCode.Malformed,
          `Invalid translate transform: ${hit[0]}`,
        );
      local = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
    } else if (fn === 'scale') {
      if (args.length < 1 || args.length > 2)
        throw new RetikzSvgTransformError(RetikzSvgTransformErrorCode.Malformed, `Invalid scale transform: ${hit[0]}`);
      const sx = args[0] ?? 1;
      local = [sx, 0, 0, args[1] ?? sx, 0, 0];
    } else if (fn === 'matrix') {
      if (args.length !== 6)
        throw new RetikzSvgTransformError(RetikzSvgTransformErrorCode.Malformed, `Invalid matrix transform: ${hit[0]}`);
      local = [args[0], args[1], args[2], args[3], args[4], args[5]];
    } else {
      throw new RetikzSvgTransformError(RetikzSvgTransformErrorCode.Unsupported, `Unsupported SVG transform: ${fn}`);
    }
    matrix = multiplyAffine(matrix, local);
    cursor = re.lastIndex;
  }
  if (source.slice(cursor).trim().length > 0) {
    throw new RetikzSvgTransformError(
      RetikzSvgTransformErrorCode.Malformed,
      `Malformed SVG transform syntax: ${source}`,
    );
  }
  return matrix;
};
