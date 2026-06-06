import type { Position } from './point';

/*
 * 弧几何工具：arc / circlePath / ellipsePath 共用的端点 / bbox 计算。
 * 角度约定（与 polar.ts 一致，SVG y-down）：endpoint = [cx + r·cos(θ), cy + r·sin(θ)]，
 * 0=+x(east), 90=+y(south,视觉下), 180=-x(west), 270=-y(north,视觉上)。
 * 角度递增=SVG 屏幕顺时针。
 */

const DEG_TO_RAD = Math.PI / 180;

/**
 * 在 [lo, hi] 内枚举所有 90°·k 方向角（弧轴向极值候选）
 * @description 一圈最多 4 个轴向，合法弧 sweep ≤ 360° → 至多 5 个 90°·k；正常区间直接 for 扫。
 *   但 lo/hi 为巨型角度（如 1e308）时 k=ceil(lo/90) 落在浮点无整数分辨率区，`k++` 满足 k+1===k →
 *   for 循环永不前进而挂死（DoS）。此时端点投影已覆盖全部 x/y 极值（巨角下弧实际是退化点 / 单端），
 *   轴向点无新增信息 → 直接跳过枚举。守卫：仅当 kEnd−kStart 是 finite 且 ≤ 安全上界（远大于
 *   任何合法弧的轴向点数）时才枚举，否则返回空（端点已足够定界）。
 */
const axisAngles = (lo: number, hi: number): Array<number> => {
  const kStart = Math.ceil(lo / 90); // 第一个 >= lo 的 90°·k
  const kEnd = Math.floor(hi / 90);  // 最后一个 <= hi 的 90°·k
  const span = kEnd - kStart;
  // span 非 finite / 过大（巨型角度落入浮点无整数分辨率区，k++ 不前进）→ 端点已定界，无需轴向点
  if (!Number.isFinite(span) || span < 0 || span > 1_000_000) return [];
  const angles: Array<number> = [];
  for (let k = kStart; k <= kEnd; k++) angles.push(k * 90);
  return angles;
};

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
  for (const angle of axisAngles(lo, hi)) {
    // 端角已通过端点投影包含
    if (angle === startAngleDeg || angle === endAngleDeg) continue;
    points.push(arcEndPoint(center, radius, angle));
  }
  return points;
};

/** 角度（度）→ 规范化到 [0, 360) */
const normalizeDeg = (deg: number): number => {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
};

/**
 * 角度 a（度）是否落在弧的角度区间 [startAngle, endAngle] 内（含端点，带容差）
 * @description 与 ir/path arc 同约定：弧从 startAngle 扫到 endAngle，counterClockwise=false（缺省）
 *   时角度递增（屏幕顺时针）、true 时角度递减（逆时针）。统一把扫描量化为「从 start 出发、沿扫描方向
 *   累积的非负 sweep ∈ [0, |span|]」判定，跨 360°、负角、巨型角都正确（不死循环）。
 */
export const arcAngleInRange = (
  startAngleDeg: number,
  endAngleDeg: number,
  angleDeg: number,
  toleranceDeg = 1e-7,
): boolean => {
  const span = endAngleDeg - startAngleDeg;
  const total = Math.abs(span);
  if (total >= 360 - toleranceDeg) return true; // 整圆
  const ccw = span < 0;
  // 从 start 量到 angle 的「沿扫描方向」非负角差
  const raw = ccw ? startAngleDeg - angleDeg : angleDeg - startAngleDeg;
  const swept = normalizeDeg(raw);
  return swept <= total + toleranceDeg || swept >= 360 - toleranceDeg;
};

/**
 * 射线（origin + 单位方向 dir）∩ 圆弧（center, radius, [startAngle, endAngle]）
 * @description 泛化 sector 的内联 rayCircle：先解 |origin + s·dir|² = radius² 得至多两个参数 s，
 *   再用 arcAngleInRange 过滤掉不在弧角度区间内的交点。返回沿射线的正向参数 s（命中点 = origin + s·dir），
 *   按 s 升序、仅含 s > tolerance 的正向交点；不在区间内的根被剔除。dir 必须为单位向量。
 */
export const rayArc = (
  origin: Position,
  dir: Position,
  center: Position,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  tolerance = 1e-9,
): Array<number> => {
  // 平移到以 center 为原点：o = origin - center
  const ox = origin[0] - center[0];
  const oy = origin[1] - center[1];
  const ux = dir[0];
  const uy = dir[1];
  // |o + s·u|² = radius²  →  s² + 2(o·u)s + (|o|² - r²) = 0（u 单位向量）
  const b = 2 * (ox * ux + oy * uy);
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const roots = [(-b - sq) / 2, (-b + sq) / 2];
  const hits: Array<number> = [];
  for (const s of roots) {
    if (s <= tolerance) continue;
    const px = ox + s * ux;
    const py = oy + s * uy;
    const angle = Math.atan2(py, px) * (180 / Math.PI);
    if (arcAngleInRange(startAngleDeg, endAngleDeg, angle)) hits.push(s);
  }
  hits.sort((a, z) => a - z);
  return hits;
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
  for (const angle of axisAngles(lo, hi)) {
    if (angle === startAngleDeg || angle === endAngleDeg) continue;
    points.push(ellipseArcPoint(center, radiusX, radiusY, angle));
  }
  return points;
};
