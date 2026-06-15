import type { Position } from '../geometry/point';

/** 一段三次贝塞尔：两控制点 + 终点（起点为上一段终点 / 首段为第一个 knot） */
export type CubicSegment = { control1: Position; control2: Position; to: Position };

/** 过点平滑曲线相关纯几何工具（centripetal Catmull-Rom） */
export const curve = {
  /**
   * centripetal Catmull-Rom（α=0.5）穿过 knots → 三次贝塞尔段链
   * @description 输入至少 2 个 knot；返回 `knots.length - 1` 段，段[i].to 严格命中 knots[i+1]
   *   （Catmull-Rom 过点）。tension 为切线长度乘子（TikZ `tension`）：1 为标准、<1 更紧、>1 更鼓。
   *   centripetal 参数化（按相邻 knot 距离的 0.5 次幂）在点距不均时不产 cusp / 自交。
   *   开放曲线两端用单侧切线。
   */
  catmullRomToCubic: (knots: Array<Position>, tension: number): Array<CubicSegment> => {
    void knots;
    void tension;
    throw new Error('not implemented');
  },
};
