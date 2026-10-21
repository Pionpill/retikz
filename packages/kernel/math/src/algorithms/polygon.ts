import type { Position } from '../primitives';

/** 简单多边形运算 */
export const polygon = {
  /**
   * 点是否在简单多边形内（ray-casting 奇偶规则；顶点按序，不要求凹凸 / 绕向）
   * @description 边界点结果未定义，调用方需按自身语义处理
   * @remarks 复杂度：时间 O(n)，空间 O(1)，n 为顶点数
   */
  containsPoint: (vertices: Array<Position>, p: Position): boolean => {
    const n = vertices.length;
    if (n < 3) return false;

    let inside = false;
    const [px, py] = p;
    let previous = vertices[n - 1];
    let previousY = previous[1];
    let previousAbove = previousY > py;

    for (let i = 0; i < n; i++) {
      const current = vertices[i];
      const y = current[1];
      const above = y > py;
      if (above !== previousAbove) {
        const x = current[0];
        if (px < ((previous[0] - x) * (py - y)) / (previousY - y) + x) inside = !inside;
      }
      previous = current;
      previousY = y;
      previousAbove = above;
    }

    return inside;
  },
};
