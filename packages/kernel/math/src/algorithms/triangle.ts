import type { Position } from '../primitives';
import type { Circle } from './circle';

import { DEFAULT_EPSILON } from '../constants';
import { vector2 } from '../primitives';

/** 三角形外接圆与内切圆构造 */
export const triangle = {
  /**
   * 外接圆（过三顶点的圆）
   * @description 三点共线（面积≈0）返回 null
   * @remarks 复杂度：时间 O(1)，空间 O(1)
   */
  circumCircle: (a: Position, b: Position, c: Position): Circle | null => {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < DEFAULT_EPSILON) return null;
    const a2 = a[0] * a[0] + a[1] * a[1];
    const b2 = b[0] * b[0] + b[1] * b[1];
    const c2 = c[0] * c[0] + c[1] * c[1];
    const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
    const uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
    const center: Position = [ux, uy];
    return { center, radius: vector2.length([a[0] - ux, a[1] - uy]) };
  },
  /**
   * 内切圆（与三边相切的圆）
   * @description 三点共线或退化时返回 null
   * @remarks 复杂度：时间 O(1)，空间 O(1)
   */
  incircle: (a: Position, b: Position, c: Position): Circle | null => {
    const sideLengthA = vector2.length([b[0] - c[0], b[1] - c[1]]);
    const sideLengthB = vector2.length([c[0] - a[0], c[1] - a[1]]);
    const sideLengthC = vector2.length([a[0] - b[0], a[1] - b[1]]);
    const perimeter = sideLengthA + sideLengthB + sideLengthC;
    if (perimeter < DEFAULT_EPSILON) return null;
    const area = Math.abs(vector2.cross([b[0] - a[0], b[1] - a[1]], [c[0] - a[0], c[1] - a[1]])) / 2;
    if (area < DEFAULT_EPSILON) return null;
    const center: Position = [
      (sideLengthA * a[0] + sideLengthB * b[0] + sideLengthC * c[0]) / perimeter,
      (sideLengthA * a[1] + sideLengthB * b[1] + sideLengthC * c[1]) / perimeter,
    ];
    return { center, radius: area / (perimeter / 2) };
  },
};
