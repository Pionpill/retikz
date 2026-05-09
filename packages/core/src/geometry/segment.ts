import type { Position } from './point';

/*
 * 段几何采样工具——为 ADR-0004 边标注（step.label）服务。
 *
 * 每种段（line / quad / cubic / fold / arc / circle / ellipse）提供一个
 * `*SegmentSample` 函数：给定段参数 + 进度 t∈[0,1]，返回 t 处的点坐标
 * 与切线方向（已归一化为单位向量）。
 *
 * 用途：compile/path 在 emit 完路径段后，按 label.position 把 t 映射成
 * `0.25 / 0.5 / 0.75`（near-start / midway / near-end），再据 sample 算
 * 标签位置 / 旋转。
 *
 * 参数化约定：
 * - 直线 / 贝塞尔：与几何参数一致（line `t·(to-from)+from`；Bezier 标准）。
 * - fold（折角）：t∈[0, 0.5] 走第一段（参数 2t），t∈(0.5, 1] 走第二段（参数 2t-1）。
 *   t=0.5 落在 corner，切线取第一段方向。
 * - arc：angle(t) = startAngle + t · (endAngle - startAngle)；切线沿弧扫描方向。
 * - circle / ellipse：参数 angle = t · 360°，从 0°（east）开始。
 */

const DEG_TO_RAD = Math.PI / 180;

export type SegmentSample = {
  /** t 处的点坐标 */
  point: Position;
  /** t 处的切线方向（单位向量；零向量时回退到 [1, 0]） */
  tangent: Position;
};

const normalize = (v: Position): Position => {
  const len = Math.hypot(v[0], v[1]);
  if (len === 0) return [1, 0];
  return [v[0] / len, v[1] / len];
};

/** 直线段 from → to */
export const lineSegmentSample = (
  from: Position,
  to: Position,
  t: number,
): SegmentSample => ({
  point: [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t],
  tangent: normalize([to[0] - from[0], to[1] - from[1]]),
});

/**
 * 二次贝塞尔 from → control → to。
 * P(t)  = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 * P'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
 */
export const quadSegmentSample = (
  from: Position,
  control: Position,
  to: Position,
  t: number,
): SegmentSample => {
  const u = 1 - t;
  const point: Position = [
    u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
    u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
  ];
  const tx = 2 * u * (control[0] - from[0]) + 2 * t * (to[0] - control[0]);
  const ty = 2 * u * (control[1] - from[1]) + 2 * t * (to[1] - control[1]);
  return { point, tangent: normalize([tx, ty]) };
};

/**
 * 三次贝塞尔 from → c1 → c2 → to。
 * P'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
 */
export const cubicSegmentSample = (
  from: Position,
  c1: Position,
  c2: Position,
  to: Position,
  t: number,
): SegmentSample => {
  const u = 1 - t;
  const point: Position = [
    u * u * u * from[0] +
      3 * u * u * t * c1[0] +
      3 * u * t * t * c2[0] +
      t * t * t * to[0],
    u * u * u * from[1] +
      3 * u * u * t * c1[1] +
      3 * u * t * t * c2[1] +
      t * t * t * to[1],
  ];
  const tx =
    3 * u * u * (c1[0] - from[0]) +
    6 * u * t * (c2[0] - c1[0]) +
    3 * t * t * (to[0] - c2[0]);
  const ty =
    3 * u * u * (c1[1] - from[1]) +
    6 * u * t * (c2[1] - c1[1]) +
    3 * t * t * (to[1] - c2[1]);
  return { point, tangent: normalize([tx, ty]) };
};

/**
 * 折角段 from → corner → to。
 * t∈[0, 0.5] 走第一段（参数 2t）；t∈(0.5, 1] 走第二段（参数 2t-1）。
 * t=0.5 落在 corner，切线取第一段方向（与"靠近 prev 一侧"一致）。
 */
export const foldSegmentSample = (
  from: Position,
  corner: Position,
  to: Position,
  t: number,
): SegmentSample => {
  if (t <= 0.5) return lineSegmentSample(from, corner, t * 2);
  return lineSegmentSample(corner, to, t * 2 - 1);
};

/**
 * 弧段（与 ir/path arc 同约定，角度单位为度）。
 * 切线沿"扫描方向"——endAngle ≥ startAngle 时为 (-sin, cos)，否则反向。
 */
export const arcSegmentSample = (
  center: Position,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  t: number,
): SegmentSample => {
  const angleDeg = startAngleDeg + t * (endAngleDeg - startAngleDeg);
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sweepSign = endAngleDeg >= startAngleDeg ? 1 : -1;
  return {
    point: [center[0] + radius * cos, center[1] + radius * sin],
    tangent: normalize([-sin * sweepSign, cos * sweepSign]),
  };
};

/**
 * 整圆——从 0°（east）开始，与 compile/path circlePath 输出方向（右→左→右，sweep=1）一致。
 */
export const circleSegmentSample = (
  center: Position,
  radius: number,
  t: number,
): SegmentSample => {
  const angleDeg = t * 360;
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    point: [center[0] + radius * cos, center[1] + radius * sin],
    tangent: normalize([-sin, cos]),
  };
};

/** 整椭圆——参数化 (rx·cos(2πt), ry·sin(2πt)) */
export const ellipseSegmentSample = (
  center: Position,
  rx: number,
  ry: number,
  t: number,
): SegmentSample => {
  const angleDeg = t * 360;
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    point: [center[0] + rx * cos, center[1] + ry * sin],
    tangent: normalize([-rx * sin, ry * cos]),
  };
};
