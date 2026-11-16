import type { CanonicalCoordinate } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';

/** ⚡只展开坐标字段与位置顶层属性；嵌套位置引用变化时保守重算 */
export const compareCanonicalCoordinates = (left: CanonicalCoordinate, right: CanonicalCoordinate): boolean =>
  compareProperties(left, right, { depth: 2 });
