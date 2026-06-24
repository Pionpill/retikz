import type { Position } from './point';

/** 多边形相关纯几何工具 */
export const polygon = {
  /**
   * 点是否在简单多边形内（ray-casting 奇偶规则；顶点按序，不要求凹凸 / 绕向）
   * @description 边界点结果未定义（首切不保证；落边界由调用方按需处理）
   */
  containsPoint: (vertices: Array<Position>, p: Position): boolean => {
    const n = vertices.length;
    if (n < 3) return false;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];
      const intersects = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  },
};
