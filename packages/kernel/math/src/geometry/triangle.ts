import type { Circle } from './circle';
import type { Position } from './point';

import { DEFAULT_EPSILON } from '../constants';
import { point } from './point';

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
    return { center, radius: point.length([a[0] - ux, a[1] - uy]) };
  },
  /**
   * 内切圆（与三边相切的圆）
   * @description 三点共线或退化时返回 null
   * @remarks 复杂度：时间 O(1)，空间 O(1)
   */
  inCircle: (a: Position, b: Position, c: Position): Circle | null => {
    const la = point.length([b[0] - c[0], b[1] - c[1]]);
    const lb = point.length([c[0] - a[0], c[1] - a[1]]);
    const lc = point.length([a[0] - b[0], a[1] - b[1]]);
    const perim = la + lb + lc;
    if (perim < DEFAULT_EPSILON) return null;
    const area = Math.abs(point.cross([b[0] - a[0], b[1] - a[1]], [c[0] - a[0], c[1] - a[1]])) / 2;
    if (area < DEFAULT_EPSILON) return null;
    const center: Position = [(la * a[0] + lb * b[0] + lc * c[0]) / perim, (la * a[1] + lb * b[1] + lc * c[1]) / perim];
    return { center, radius: area / (perim / 2) };
  },
};
