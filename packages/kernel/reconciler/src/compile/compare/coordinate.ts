import type { CanonicalCoordinate } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

/** 比较确定化后的坐标表达式，省略与显式默认值等价 */
export const compareCanonicalCoordinates = (left: CanonicalCoordinate, right: CanonicalCoordinate): boolean =>
  jsonStructuralEquals(left, right);
