import type { AffineMatrix } from '@retikz/math';

import { AFFINE_IDENTITY, multiplyAffine } from '@retikz/math';

import { RetikzTexError, RetikzTexErrorCode } from '../error';

const malformedTransform = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, message);
};

const unsupportedTransform = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgUnsupported, message);
};

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
      malformedTransform(`Malformed SVG transform syntax: ${source}`);
    }
    const fn = hit[1];
    const args = hit[2]
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(Number);
    if (args.some(arg => !Number.isFinite(arg))) {
      malformedTransform(`Invalid SVG transform argument: ${hit[0]}`);
    }
    const local: AffineMatrix = (() => {
      if (fn === 'translate') {
        if (args.length < 1 || args.length > 2) malformedTransform(`Invalid translate transform: ${hit[0]}`);
        return [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
      }
      if (fn === 'scale') {
        if (args.length < 1 || args.length > 2) malformedTransform(`Invalid scale transform: ${hit[0]}`);
        const sx = args[0] ?? 1;
        return [sx, 0, 0, args[1] ?? sx, 0, 0];
      }
      if (fn === 'matrix') {
        if (args.length !== 6) malformedTransform(`Invalid matrix transform: ${hit[0]}`);
        return [args[0], args[1], args[2], args[3], args[4], args[5]];
      }
      return unsupportedTransform(`Unsupported SVG transform: ${fn}`);
    })();
    matrix = multiplyAffine(matrix, local);
    cursor = re.lastIndex;
  }
  if (source.slice(cursor).trim().length > 0) {
    malformedTransform(`Malformed SVG transform syntax: ${source}`);
  }
  return matrix;
};
