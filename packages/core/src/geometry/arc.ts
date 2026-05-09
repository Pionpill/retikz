import type { Position } from './point';

/*
 * 弧几何工具——为 ADR-0002 引入的 `arc` / `circlePath` / `ellipsePath` 三种 IR step 服务。
 *
 * 角度约定：与 polar.ts 一致，使用 SVG y-down 原始坐标——
 *   endpoint = [cx + r·cos(θ), cy + r·sin(θ)]   // y 不翻转
 *   - angle=0   → +x（east）
 *   - angle=90  → +y（视觉为下，"south"）
 *   - angle=180 → -x（west）
 *   - angle=270 → -y（视觉为上，"north"）
 *
 * 这意味着角度递增方向在 SVG 屏幕上视觉是顺时针——对应 SVG <path> A 命令的
 * sweep-flag=1（在 SVG 视觉空间内为 CW，等价于我们这里 endAngle > startAngle）。
 */

const DEG_TO_RAD = Math.PI / 180;

/**
 * 给定圆心、半径、角度（度，与 polar.toPosition 同约定），返回圆周上对应点。
 */
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
 * 计算 SVG `<path>` A 命令需要的 large-arc-flag 与 sweep-flag。
 *
 * - `largeArc`：弧跨度 `|endAngle - startAngle|` 严格大于 180° 时为 1。
 * - `sweep`：`endAngle >= startAngle` 时为 1，否则为 0；与"角度增加方向 = 在
 *   SVG 屏幕上视觉顺时针"一致——因为我们投影时未翻转 y，SVG sweep=1（屏幕 CW）
 *   恰好等价 math 角度增加。
 *
 * 边界：`|Δ|=180°` 时 `largeArc=0`（半弧不算大弧）；恰好同点 `|Δ|=0` 也返回 0。
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
 * 弧的 bounding box 极值候选点：起点、终点，以及 `[startAngle, endAngle]` 区间
 * 里所有 90°·k 的基本方向（0°、90°、180°、270° 及其周期延拓）对应的圆周点。
 *
 * 这些点是计算视图框（viewBox）/ bbox 时必须考虑的候选——因为弧线投影到 x/y
 * 轴的极值只可能在弧端点或圆周上的轴向四点处出现。
 *
 * 说明：
 * - 接受 `endAngle < startAngle`（CW math 方向）：以 `min..max` 区间扫描 90°·k；
 *   语义上是"无论扫描方向，此弧覆盖到的角度区间内的基本方向都算极值候选"。
 * - 跨 360°（如 270° → 450°）也按数值区间处理，正确收录中间穿越的 0°、90° 等。
 * - 不去重：若起点恰好落在 90°·k 上会同时出现两次，调用方根据需要再处理。
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
  // 第一个 >= lo 的 90°·k
  const kStart = Math.ceil(lo / 90);
  // 最后一个 <= hi 的 90°·k
  const kEnd = Math.floor(hi / 90);
  for (let k = kStart; k <= kEnd; k++) {
    const angle = k * 90;
    // 不重复加入恰好等于端角的方向（已通过端点投影包含）
    if (angle === startAngleDeg || angle === endAngleDeg) continue;
    points.push(arcEndPoint(center, radius, angle));
  }
  return points;
};
