import type { Position } from './point';

/*
 * 弧几何工具，服务 ADR-0002 的 arc/circlePath/ellipsePath。
 * 角度约定（与 polar.ts 一致，SVG y-down）：endpoint = [cx + r·cos(θ), cy + r·sin(θ)]，
 * 0=+x(east), 90=+y(south,视觉下), 180=-x(west), 270=-y(north,视觉上)。
 * 角度递增=SVG 屏幕顺时针，对应 <path> A 命令 sweep-flag=1（endAngle > startAngle）。
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
 * SVG `<path>` A 命令的 large-arc-flag 与 sweep-flag
 * @description largeArc：弧跨度 |Δ| > 180° 为 1；sweep：endAngle >= startAngle 为 1（角度增加 = SVG 屏幕 CW）。|Δ|=180°/0° 时 largeArc=0
 */
export const arcSvgFlags = (
  startAngleDeg: number,
  endAngleDeg: number,
): { largeArc: 0 | 1; sweep: 0 | 1 } => {
  const delta = Math.abs(endAngleDeg - startAngleDeg);
  return {
    largeArc: delta > 180 ? 1 : 0,
    sweep: endAngleDeg >= startAngleDeg ? 1 : 0,
  };
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
