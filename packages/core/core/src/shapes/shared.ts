import { arcBoundingPoints, arcEndPoint } from '../geometry/arc';
import type { Position } from '../geometry/point';

const DEG_TO_RAD = Math.PI / 180;

/** sector / arc 共用的角度约定起止角 */
type AngularRange = {
  /** 规范化后的起始角（度）= 原 startAngle */
  start: number;
  /** 规范化后的终止角（度）≥ start（end<start 时已加 360°） */
  end: number;
  /** 起止角中分角（度），= (start + end) / 2 */
  mid: number;
};

/**
 * 规范化起止角：保证 end ≥ start（end<start 时加 360° 直至 ≥ start），并给出中分角
 * @description 角度沿屏幕系（角度递增=CW）从 start 扫到 end；end<start 视为跨过 360°，与 polar / geometry/arc 约定一致。
 *   end<start 时一次性加上 360°·k（k 为使 end ≥ start 的最小非负整数），O(1) 闭式计算——
 *   避免 while 循环在巨型角度（如 1e308 浮点 end+360===end 卡死、1e9 退化成数百万次迭代）下挂死。
 *   end 已 ≥ start 时 ceil((start−end)/360) ≤ 0，k 取 0、end 不变（语义与原逐次加法等价）。
 */
export const normalizeAngularRange = (startAngle: number, endAngle: number): AngularRange => {
  const k = Math.max(0, Math.ceil((startAngle - endAngle) / 360));
  const end = endAngle + 360 * k;
  return { start: startAngle, end, mid: (startAngle + end) / 2 };
};

/**
 * sector 的派生几何（circumscribe / boundaryPoint / anchor / emit 单一真源）
 * @description 据 params（内外半径 + 起止角）在「圆心(apex)为原点」局部系算精确 AABB 与各特征点偏移。
 *   AABB 覆盖 圆心 ∪ 外弧 ∪ 内弧（含弧跨过的 90°·k 轴向 outerRadius 极值点），其半轴即 circumscribe 输出；
 *   apex / centroid 等特征点以「相对 AABB 中心的偏移」给出，便于上层用 rect.center + offset 落到世界系。
 */
export type SectorGeometry = {
  /** 规范化起止角与中分角 */
  range: AngularRange;
  /** 含圆心 + 内外弧的精确 AABB 半轴（circumscribe 输出） */
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  /** 圆心(apex)相对 AABB 中心的偏移（apex 常在 AABB 内角，非 AABB 中心） */
  apexOffset: Position;
  /** 质心(centroid)相对 AABB 中心的偏移；大角度环形扇区的质心可能落入内孔。 */
  centroidOffset: Position;
  /** boundaryPoint 射线起点偏移；环形扇区使用填充环楔内的点，而不是质心。 */
  boundaryOriginOffset: Position;
};

/** sector params 的最小结构（与 sector.ts 的 SectorParams 同形，避免循环 import 类型） */
type SectorGeometryInput = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

/**
 * 计算 sector 单一真源几何
 * @description 局部系以圆心为原点：候选极值点 = 圆心(0,0) ∪ 外弧 bbox 点 ∪ 内弧 bbox 点
 *   （arcBoundingPoints 已含起止端点与区间内 90°·k 轴向点）。由这些点的 min/max 得 AABB，
 *   AABB 中心相对圆心的偏移即 −apexOffset。质心用环楔解析公式（极坐标积分）。
 */
export const sectorGeometry = (params: SectorGeometryInput): SectorGeometry => {
  const { innerRadius, outerRadius } = params;
  const range = normalizeAngularRange(params.startAngle, params.endAngle);
  const apex: Position = [0, 0];

  const candidates: Array<Position> = innerRadius === 0 ? [apex] : [];
  candidates.push(...arcBoundingPoints(apex, outerRadius, range.start, range.end));
  if (innerRadius > 0) {
    candidates.push(...arcBoundingPoints(apex, innerRadius, range.start, range.end));
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [px, py] of candidates) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const halfWidth = (maxX - minX) / 2;
  const halfHeight = (maxY - minY) / 2;
  // AABB 中心（圆心局部系）；apex(0,0) 相对 AABB 中心的偏移 = −AABB 中心
  const aabbCenter: Position = [(minX + maxX) / 2, (minY + maxY) / 2];
  const apexOffset: Position = [-aabbCenter[0], -aabbCenter[1]];

  // 质心：环楔（annular sector）质心在中分角方向上，到圆心距离
  //   rBar = (2/3)·(sin(Δ/2)/(Δ/2))·(R³−r³)/(R²−r²)，Δ=张角弧度。
  //   退化（Δ→0）时取算术中点半径兜底，避免除零。
  const sweepRad = (range.end - range.start) * DEG_TO_RAD;
  const midRad = range.mid * DEG_TO_RAD;
  const R = outerRadius;
  const r = innerRadius;
  const half = sweepRad / 2;
  const areaDenom = R * R - r * r;
  let centroidRadius: number;
  if (Math.abs(half) < 1e-9 || Math.abs(areaDenom) < 1e-12) {
    centroidRadius = (R + r) / 2;
  } else {
    centroidRadius = (2 / 3) * (Math.sin(half) / half) * ((R * R * R - r * r * r) / areaDenom);
  }
  const centroidLocal: Position = [
    Math.cos(midRad) * centroidRadius,
    Math.sin(midRad) * centroidRadius,
  ];
  const centroidOffset: Position = [
    centroidLocal[0] - aabbCenter[0],
    centroidLocal[1] - aabbCenter[1],
  ];
  const boundaryOriginRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : centroidRadius;
  const boundaryOriginLocal: Position = [
    Math.cos(midRad) * boundaryOriginRadius,
    Math.sin(midRad) * boundaryOriginRadius,
  ];
  const boundaryOriginOffset: Position = [
    boundaryOriginLocal[0] - aabbCenter[0],
    boundaryOriginLocal[1] - aabbCenter[1],
  ];

  return {
    range,
    aabbHalfAxes: { halfWidth, halfHeight },
    apexOffset,
    centroidOffset,
    boundaryOriginOffset,
  };
};

/** sector 局部系点（圆心为原点）：极角(度) + 半径 → 直角坐标 */
export const sectorPolarPoint = (radius: number, angleDeg: number): Position =>
  arcEndPoint([0, 0], radius, angleDeg);
