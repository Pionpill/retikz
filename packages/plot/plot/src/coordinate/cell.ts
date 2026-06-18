import { RETIKZ_POLAR_SEGMENT_SAMPLES } from './constants';
import type { DimensionRole } from './types';

/**
 * 正交 cell（scale 输出空间的一段 primary 带 × 一段 secondary 区间）
 * @description 区间类 mark（interval / sector / rect）的坐标系无关描述：cartesian primary=x 像素带 [lo,hi]、
 *   secondary=y 像素 [base,value]；polar primary=角度带 [start°,end°]、secondary=半径 [inner,outer]。
 *   frame.projectCell 把它投影成 CellGeometry。区间端点不要求有序（投影方各自处理方向 / swap）。
 */
export type Cell = {
  /** 按位置角色记录的输出区间；各坐标系只读取自己声明的 roles */
  intervals: Partial<Record<DimensionRole, [number, number]>>;
};

/**
 * frame 投影 cell 的产物：闭式快路（rect / sector）⊕ contour 兜底（判别 union）
 * @description cartesian → rect（轴对齐矩形）、polar → sector（环楔），皆 O(1) 闭式参数；曲线 / 自定义 frame
 *   经自身投影把四边密采样成 contour 顶点环。mark 侧据 kind 统一装配 core Node（rect→rectangle、sector→sector、
 *   contour→contour shape），不再按坐标系分叉。
 */
export type CellGeometry =
  | { kind: 'rect'; position: [number, number]; width: number; height: number }
  | { kind: 'sector'; center: [number, number]; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number }
  | { kind: 'contour'; points: Array<[number, number]> };

export const cellInterval = (cell: Cell, role: DimensionRole): [number, number] => {
  const interval = cell.intervals[role];
  if (interval === undefined) throw new Error(`lowerPlots: cell is missing "${role}" interval`);
  return interval;
};

const firstCellInterval = (cell: Cell, roles: ReadonlyArray<DimensionRole>): [number, number] => {
  for (const role of roles) {
    const interval = cell.intervals[role];
    if (interval !== undefined) return interval;
  }
  throw new Error(`lowerPlots: cell is missing interval for roles [${roles.join(', ')}]`);
};

type BarycentricPoint = [number, number, number];

type CellTernaryVertices = [[number, number], [number, number], [number, number]];

const TERNARY_EPSILON = 1e-9;

const sortedInterval = (interval: [number, number]): [number, number] =>
  interval[0] <= interval[1] ? interval : [interval[1], interval[0]];

const interpolateBarycentric = (a: BarycentricPoint, b: BarycentricPoint, roleIndex: number, boundary: number): BarycentricPoint => {
  const delta = b[roleIndex] - a[roleIndex];
  if (Math.abs(delta) < TERNARY_EPSILON) return a;
  const t = (boundary - a[roleIndex]) / delta;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};

const clipBarycentricPolygon = (
  polygon: Array<BarycentricPoint>,
  roleIndex: number,
  boundary: number,
  keep: (value: number, boundary: number) => boolean,
): Array<BarycentricPoint> => {
  if (polygon.length === 0) return [];
  const clipped: Array<BarycentricPoint> = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentInside = keep(current[roleIndex], boundary);
    const previousInside = keep(previous[roleIndex], boundary);
    if (currentInside !== previousInside) clipped.push(interpolateBarycentric(previous, current, roleIndex, boundary));
    if (currentInside) clipped.push(current);
  }
  return clipped;
};

const clampUnitInterval = (interval: [number, number]): [number, number] => {
  const [lo, hi] = sortedInterval(interval);
  return [Math.max(0, lo), Math.min(1, hi)];
};

export const ternaryCellContour = (cell: Cell, vertices: CellTernaryVertices): Array<[number, number]> => {
  const intervals = [clampUnitInterval(cellInterval(cell, 'x')), clampUnitInterval(cellInterval(cell, 'y')), clampUnitInterval(cellInterval(cell, 'z'))];
  if (intervals.some(([lo, hi]) => lo > hi)) return [];
  let polygon: Array<BarycentricPoint> = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let roleIndex = 0; roleIndex < intervals.length; roleIndex += 1) {
    const [lo, hi] = intervals[roleIndex];
    polygon = clipBarycentricPolygon(polygon, roleIndex, lo, (value, boundary) => value >= boundary - TERNARY_EPSILON);
    polygon = clipBarycentricPolygon(polygon, roleIndex, hi, (value, boundary) => value <= boundary + TERNARY_EPSILON);
  }
  const [vx, vy, vz] = vertices;
  return polygon.map(([x, y, z]) => [x * vx[0] + y * vy[0] + z * vz[0], x * vx[1] + y * vy[1] + z * vz[1]]);
};

/** densifyCellContour 选项：标记哪条位置轴是曲线（曲边每边 N 段，直边每边 1 段） */
export type DensifyCellContourOptions = {
  /** primary 轴是否曲线（沿 primary 走的两条边按 N 段密采样；false → 每边 1 段） */
  curvedPrimary?: boolean;
  /** secondary 轴是否曲线（沿 secondary 走的两条边按 N 段密采样；false → 每边 1 段） */
  curvedSecondary?: boolean;
};

/**
 * 正交 cell 四边密采样成闭合 contour 顶点环（供曲线 / 自定义 frame 在自身 projectCell 内调用）
 * @description 四角 = (p0,s0)→(p1,s0)→(p1,s1)→(p0,s1) 逆/顺时针绕一圈。沿 primary 走的边（底 / 顶）与沿
 *   secondary 走的边（右 / 左）各按对应轴是否曲线选段数：曲边 RETIKZ_POLAR_SEGMENT_SAMPLES 段、直边 1 段。
 *   projectFn 把「输出空间 (primary, secondary)」映成屏幕点（只有 frame 自己知道后段映射）；非有限点跳过。
 *   每条边只产「不含起点的中间点 + 终点」，避免相邻边重复顶点；首尾天然闭合（contour shape 隐式闭合，不重复首点）。
 */
export const densifyCellContour = (
  cell: Cell,
  projectFn: (primary: number, secondary: number) => [number, number] | null,
  options?: DensifyCellContourOptions,
): Array<[number, number]> => {
  const [p0, p1] = firstCellInterval(cell, ['x']);
  const [s0, s1] = firstCellInterval(cell, ['y']);
  const primarySegments = options?.curvedPrimary ? RETIKZ_POLAR_SEGMENT_SAMPLES + 1 : 1;
  const secondarySegments = options?.curvedSecondary ? RETIKZ_POLAR_SEGMENT_SAMPLES + 1 : 1;
  const points: Array<[number, number]> = [];
  // 沿某条边在 (primary, secondary) 输出空间线性走，逐点投影；只推「不含起点」的中间点 + 终点
  const walk = (from: [number, number], to: [number, number], segments: number): void => {
    for (let step = 1; step <= segments; step += 1) {
      const t = step / segments;
      const primary = from[0] + (to[0] - from[0]) * t;
      const secondary = from[1] + (to[1] - from[1]) * t;
      const point = projectFn(primary, secondary);
      if (point) points.push(point);
    }
  };
  // 底边（s0，primary p0→p1）→ 右边（p1，secondary s0→s1）→ 顶边（s1，primary p1→p0）→ 左边（p0，secondary s1→s0）
  walk([p0, s0], [p1, s0], primarySegments);
  walk([p1, s0], [p1, s1], secondarySegments);
  walk([p1, s1], [p0, s1], primarySegments);
  walk([p0, s1], [p0, s0], secondarySegments);
  return points;
};
