import type { Position } from './point';

/*
 * 弧几何工具：arc / circlePath / ellipsePath 共用的端点 / bbox 计算。
 * 角度约定（与 polar.ts 一致，SVG y-down）：endpoint = [cx + r·cos(θ), cy + r·sin(θ)]，
 * 0=+x(east), 90=+y(south,视觉下), 180=-x(west), 270=-y(north,视觉上)。
 * 角度递增=SVG 屏幕顺时针。
 */

const DEG_TO_RAD = Math.PI / 180;

/** 圆心、半径、角度（度，与 polar.toPosition 同约定）→ 圆周上对应点 */
export const arcEndPoint = (
  center: Position,
  radius: number,
  angleDeg: number,
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  return [
    center[0] + Math.cos(rad) * radius,
    center[1] + Math.sin(rad) * radius,
  ];
};

/**
 * 弧的 bbox 极值候选：起点、终点，加 [startAngle,endAngle] 内所有 90°·k 方向的圆周点
 * @description 弧投影到 x/y 轴的极值只可能在弧端点或圆周轴向四点出现。endAngle < startAngle 时按 min..max 扫描；跨 360°（270→450）按数值区间正确处理；不去重——端角恰在 90°·k 上时调用方处理
 */
export const arcBoundingPoints = (
  center: Position,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): Array<Position> => {
  const points: Array<Position> = [
    arcEndPoint(center, radius, startAngleDeg),
    arcEndPoint(center, radius, endAngleDeg),
  ];

  const lo = Math.min(startAngleDeg, endAngleDeg);
  const hi = Math.max(startAngleDeg, endAngleDeg);
  const kStart = Math.ceil(lo / 90); // 第一个 >= lo 的 90°·k
  const kEnd = Math.floor(hi / 90);  // 最后一个 <= hi 的 90°·k
  for (let k = kStart; k <= kEnd; k++) {
    const angle = k * 90;
    // 端角已通过端点投影包含
    if (angle === startAngleDeg || angle === endAngleDeg) continue;
    points.push(arcEndPoint(center, radius, angle));
  }
  return points;
};

/**
 * 椭圆弧参数点：中心 + 半轴 rx/ry + 参数角（度）→ 椭圆周上点
 * @description 与 arcEndPoint 同角度约定（SVG y-down）；endpoint = [cx + rx·cosθ, cy + ry·sinθ]。
 *   θ 是参数角（非真实极角，rx≠ry 时两者不等）
 */
export const ellipseArcPoint = (
  center: Position,
  radiusX: number,
  radiusY: number,
  angleDeg: number,
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  return [
    center[0] + Math.cos(rad) * radiusX,
    center[1] + Math.sin(rad) * radiusY,
  ];
};

/**
 * 椭圆弧 bbox 极值候选：起点、终点，加 [start,end] 区间内所有 90°·k 参数角处的椭圆周点
 * @description 轴对齐椭圆的 x 极值在 θ=0/180、y 极值在 θ=90/270，与正圆同结构（仅半轴用 rx/ry）
 */
export const ellipseArcBoundingPoints = (
  center: Position,
  radiusX: number,
  radiusY: number,
  startAngleDeg: number,
  endAngleDeg: number,
): Array<Position> => {
  const points: Array<Position> = [
    ellipseArcPoint(center, radiusX, radiusY, startAngleDeg),
    ellipseArcPoint(center, radiusX, radiusY, endAngleDeg),
  ];
  const lo = Math.min(startAngleDeg, endAngleDeg);
  const hi = Math.max(startAngleDeg, endAngleDeg);
  const kStart = Math.ceil(lo / 90);
  const kEnd = Math.floor(hi / 90);
  for (let k = kStart; k <= kEnd; k++) {
    const angle = k * 90;
    if (angle === startAngleDeg || angle === endAngleDeg) continue;
    points.push(ellipseArcPoint(center, radiusX, radiusY, angle));
  }
  return points;
};
