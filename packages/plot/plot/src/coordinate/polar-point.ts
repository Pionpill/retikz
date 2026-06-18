import type { Position } from '@retikz/math';

/** 度 → 弧度；plot polar 坐标约定为 0°=+x、90°=+y，屏幕 y 向下。 */
export const DEG_TO_RAD = Math.PI / 180;

/** 圆心 + 角度 + 半径 → 屏幕坐标；非有限角度或半径返回 null。 */
export const polarPoint = (center: Position, angleDeg: number, radius: number): Position | null => {
  if (!Number.isFinite(angleDeg) || !Number.isFinite(radius)) return null;
  const radians = angleDeg * DEG_TO_RAD;
  return [center[0] + radius * Math.cos(radians), center[1] + radius * Math.sin(radians)];
};

/** 圆心 + 角度 + 半径 → 屏幕坐标；guide 已过滤非有限值时使用的窄返回值 helper。 */
export const finitePolarPoint = (center: Position, angleDeg: number, radius: number): Position => polarPoint(center, angleDeg, radius) ?? [NaN, NaN];
