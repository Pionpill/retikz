import type { Position } from '../geometry';

import { DEFAULT_EPSILON } from '../constants';

/** 一段三次贝塞尔：两控制点 + 终点（起点为上一段终点 / 首段为第一个 knot） */
export type CubicSegment = { control1: Position; control2: Position; to: Position };

type SegmentControlsInput = {
  p0: Position;
  p1: Position;
  p2: Position;
  p3: Position;
  tension: number;
};

/**
 * 计算 centripetal Catmull-Rom 的相邻 knot 参数间距。
 * @remarks 复杂度：时间 O(1)，空间 O(1)；重合 knot 回退到 epsilon，避免后续切线计算除零。
 */
const centripetalSpacing = (a: Position, b: Position): number => {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const spacing = Math.sqrt(dist);
  return spacing < DEFAULT_EPSILON ? DEFAULT_EPSILON : spacing;
};

/**
 * 计算 P1→P2 段的三次贝塞尔控制点。
 * @remarks 复杂度：时间 O(1)，空间 O(1)；tension 缩放切线长度，不改变段终点。
 */
const segmentControls = (input: SegmentControlsInput): { control1: Position; control2: Position } => {
  const { p0, p1, p2, p3, tension } = input;
  const dt0 = centripetalSpacing(p0, p1);
  const dt1 = centripetalSpacing(p1, p2);
  const dt2 = centripetalSpacing(p2, p3);
  const tangent = (a: number, b: number, c: number, d: number): { m1: number; m2: number } => {
    const m1 = (b - a) / dt0 - (c - a) / (dt0 + dt1) + (c - b) / dt1;
    const m2 = (c - b) / dt1 - (d - b) / (dt1 + dt2) + (d - c) / dt2;
    return { m1, m2 };
  };
  const tx = tangent(p0[0], p1[0], p2[0], p3[0]);
  const ty = tangent(p0[1], p1[1], p2[1], p3[1]);
  const k = (dt1 / 3) * tension;
  return {
    control1: [p1[0] + tx.m1 * k, p1[1] + ty.m1 * k],
    control2: [p2[0] - tx.m2 * k, p2[1] - ty.m2 * k],
  };
};

/** Catmull-Rom 过点曲线到三次贝塞尔段的转换工具。 */
export const curve = {
  /**
   * centripetal Catmull-Rom（α=0.5）穿过 knots → 三次贝塞尔段链
   * @description 输入不足 2 个 knot 时返回空数组；每段终点严格命中下一个 knot。
   * @remarks 复杂度：时间 O(n)，空间 O(n)，n 为 knot 数。
   */
  catmullRomToCubic: (knots: Array<Position>, tension: number): Array<CubicSegment> => {
    const n = knots.length;
    if (n < 2) return [];

    const segments: Array<CubicSegment> = [];
    for (let i = 0; i < n - 1; i++) {
      const p1 = knots[i];
      const p2 = knots[i + 1];
      const p0 = i > 0 ? knots[i - 1] : p1;
      const p3 = i + 2 < n ? knots[i + 2] : p2;

      const { control1, control2 } = segmentControls({ p0, p1, p2, p3, tension });
      segments.push({ control1, control2, to: [p2[0], p2[1]] });
    }
    return segments;
  },
};
