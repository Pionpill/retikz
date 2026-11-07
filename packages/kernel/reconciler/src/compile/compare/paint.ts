import type { InputPaintResolution } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

/** 比较有效绘制资源，图案能力按 Definition 身份判断 */
export const comparePaintResolutions = (
  left: InputPaintResolution | undefined,
  right: InputPaintResolution | undefined,
): boolean => {
  if (left === right) return true;
  if (typeof left !== 'object' || typeof right !== 'object') return false;
  if ('pattern' in left || 'pattern' in right) {
    if (!('pattern' in left) || !('pattern' in right)) return false;
    if (left.pattern.definition !== right.pattern.definition) return false;
  }
  return jsonStructuralEquals(left, right);
};
