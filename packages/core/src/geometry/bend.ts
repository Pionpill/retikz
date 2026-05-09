import type { Position } from './point';

/**
 * 用 cubic Bezier 拟合 from→to 的弧形 bend。
 *
 * 算法（ADR-0001）：
 * 1. apex offset = chord × tan(bendAngle / 2)（沿 path 法向 left / right 偏移量）
 * 2. 控制点取 chord 1/3 / 2/3 处沿法向偏移；为让 cubic 在 t=0.5 处穿过 apex，
 *    控制点 offset = (4/3) × apex offset（推导：B(0.5) = midpoint + (3/4)·s·n）
 *
 * 法向定义（SVG y 向下，"left/right" 按视觉，不按数学）：
 *   chord direction = (dx, dy) / |chord|
 *   visual-left normal  =  ( dy, -dx) / |chord|   （从 from 看向 to，向左偏）
 *   visual-right normal =  (-dy,  dx) / |chord|
 *
 * chord 长度为 0 时无方向可推，两个控制点都返回 from。
 */
export const bendControlPoints = (
  from: Position,
  to: Position,
  direction: 'left' | 'right',
  bendAngle: number,
): [Position, Position] => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const chord = Math.hypot(dx, dy);
  if (chord === 0) return [[from[0], from[1]], [from[0], from[1]]];

  const sign = direction === 'left' ? 1 : -1;
  const nx = (dy / chord) * sign;
  const ny = (-dx / chord) * sign;

  const apexOffset = chord * Math.tan((bendAngle * Math.PI) / 180 / 2);
  const ctlOffset = (4 / 3) * apexOffset;

  const c1: Position = [from[0] + dx / 3 + ctlOffset * nx, from[1] + dy / 3 + ctlOffset * ny];
  const c2: Position = [from[0] + (2 * dx) / 3 + ctlOffset * nx, from[1] + (2 * dy) / 3 + ctlOffset * ny];
  return [c1, c2];
};
