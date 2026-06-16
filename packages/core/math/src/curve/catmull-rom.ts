import type { Position } from '../geometry/point';
import { DEFAULT_EPSILON } from '../geometry/point';

/** 一段三次贝塞尔：两控制点 + 终点（起点为上一段终点 / 首段为第一个 knot） */
export type CubicSegment = { control1: Position; control2: Position; to: Position };

/** 相邻两 knot 的 centripetal 参数间距：弦长的 0.5 次幂；零长度（重合 knot）回退到 epsilon 避免除零 */
const centripetalSpacing = (a: Position, b: Position): number => {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const spacing = Math.sqrt(dist);
  return spacing < DEFAULT_EPSILON ? DEFAULT_EPSILON : spacing;
};

/**
 * 由四个 knot 的非均匀参数切线求单段三次贝塞尔的两控制点
 * @description P1→P2 段：按参数 t0<t1<t2<t3 取 Catmull-Rom 切线
 *   m1 = (P2−P1)/(t2−t1) − (P2−P0)/(t2−t0) + (P1−P0)/(t1−t0)，
 *   m2 同理在 P2 处。再缩放回 [0,1] 区间：control1 = P1 + m1·(t2−t1)/3，control2 = P2 − m2·(t2−t1)/3。
 *   tension 为切线长度乘子，整体缩放控制点到端点的距离（1=标准 centripetal CR，>1 更鼓、<1 更紧）。
 */
const segmentControls = (
  p0: Position,
  p1: Position,
  p2: Position,
  p3: Position,
  dt0: number,
  dt1: number,
  dt2: number,
  tension: number,
): { control1: Position; control2: Position } => {
  // 各分量独立算切线（标准非均匀 Catmull-Rom 切线公式）
  const tangent = (a: number, b: number, c: number, d: number): { m1: number; m2: number } => {
    const m1 = (b - a) / dt0 - (c - a) / (dt0 + dt1) + (c - b) / dt1;
    const m2 = (c - b) / dt1 - (d - b) / (dt1 + dt2) + (d - c) / dt2;
    return { m1, m2 };
  };
  const tx = tangent(p0[0], p1[0], p2[0], p3[0]);
  const ty = tangent(p0[1], p1[1], p2[1], p3[1]);
  // 缩放回 [0,1] 段：除以 3、乘段参数跨度 dt1，再乘 tension
  const k = (dt1 / 3) * tension;
  return {
    control1: [p1[0] + tx.m1 * k, p1[1] + ty.m1 * k],
    control2: [p2[0] - tx.m2 * k, p2[1] - ty.m2 * k],
  };
};

/** 过点平滑曲线相关纯几何工具（centripetal Catmull-Rom） */
export const curve = {
  /**
   * centripetal Catmull-Rom（α=0.5）穿过 knots → 三次贝塞尔段链
   * @description 输入至少 2 个 knot；返回 `knots.length - 1` 段，段[i].to 严格命中 knots[i+1]
   *   （Catmull-Rom 过点）。tension 为切线长度乘子（TikZ `tension`）：1 为标准、<1 更紧、>1 更鼓。
   *   centripetal 参数化（按相邻 knot 距离的 0.5 次幂）在点距不均时不产 cusp / 自交；重合 knot 的间距
   *   回退到 epsilon 防除零，保证所有输出有限。开放曲线两端用单侧切线（端点 knot 复制相邻端点）。
   */
  catmullRomToCubic: (knots: Array<Position>, tension: number): Array<CubicSegment> => {
    const n = knots.length;
    if (n < 2) return [];

    const segments: Array<CubicSegment> = [];
    for (let i = 0; i < n - 1; i++) {
      const p1 = knots[i];
      const p2 = knots[i + 1];
      // 端点用单侧切线：缺前邻取 p1、缺后邻取 p2（复制端点）
      const p0 = i > 0 ? knots[i - 1] : p1;
      const p3 = i + 2 < n ? knots[i + 2] : p2;

      const dt0 = centripetalSpacing(p0, p1);
      const dt1 = centripetalSpacing(p1, p2);
      const dt2 = centripetalSpacing(p2, p3);

      const { control1, control2 } = segmentControls(p0, p1, p2, p3, dt0, dt1, dt2, tension);
      // .to 严格命中 knots[i+1]（过点），不经任何浮点缩放
      segments.push({ control1, control2, to: [p2[0], p2[1]] });
    }
    return segments;
  },
};
