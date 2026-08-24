import type { AffineMatrix } from '@retikz/math';

import { AFFINE_IDENTITY, multiplyAffine } from '@retikz/math';

import { RetikzTexError, RetikzTexErrorCode } from '../error';

const throwMalformedTransformError = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, message);
};

const throwUnsupportedTransformError = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgUnsupported, message);
};

/**
 * 解析 SVG `transform` 属性值为单一矩阵（支持 translate / scale / matrix，按出现顺序左乘累积）
 * @description MathJax SVG 仅用 `scale(1,-1)`（全局 y 翻转）+ `translate(x,y)`（字形偏移）；matrix 一并支持兜底。
 *   无 / 空 → 单位阵。未知函数或 malformed 参数会抛错，由上层降级为 null，避免静默错位
 */
export const parseSvgTransform = (value: string | undefined): AffineMatrix => {
  const source = value?.trim();
  if (!source) return AFFINE_IDENTITY;
  let matrix: AffineMatrix = AFFINE_IDENTITY;
  const transformPattern = /([a-zA-Z][\w-]*)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = transformPattern.exec(source)) !== null) {
    if (source.slice(cursor, match.index).trim().length > 0) {
      throwMalformedTransformError(`Malformed SVG transform syntax: ${source}`);
    }
    const functionName = match[1];
    const transformArguments = match[2]
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(Number);
    if (transformArguments.some(argument => !Number.isFinite(argument))) {
      throwMalformedTransformError(`Invalid SVG transform argument: ${match[0]}`);
    }
    const localMatrix: AffineMatrix = (() => {
      if (functionName === 'translate') {
        if (transformArguments.length < 1 || transformArguments.length > 2)
          throwMalformedTransformError(`Invalid translate transform: ${match[0]}`);
        return [1, 0, 0, 1, transformArguments[0] ?? 0, transformArguments[1] ?? 0];
      }
      if (functionName === 'scale') {
        if (transformArguments.length < 1 || transformArguments.length > 2)
          throwMalformedTransformError(`Invalid scale transform: ${match[0]}`);
        const scaleX = transformArguments[0] ?? 1;
        return [scaleX, 0, 0, transformArguments[1] ?? scaleX, 0, 0];
      }
      if (functionName === 'matrix') {
        if (transformArguments.length !== 6) throwMalformedTransformError(`Invalid matrix transform: ${match[0]}`);
        return [
          transformArguments[0],
          transformArguments[1],
          transformArguments[2],
          transformArguments[3],
          transformArguments[4],
          transformArguments[5],
        ];
      }
      return throwUnsupportedTransformError(`Unsupported SVG transform: ${functionName}`);
    })();
    matrix = multiplyAffine(matrix, localMatrix);
    cursor = transformPattern.lastIndex;
  }
  if (source.slice(cursor).trim().length > 0) {
    throwMalformedTransformError(`Malformed SVG transform syntax: ${source}`);
  }
  return matrix;
};
