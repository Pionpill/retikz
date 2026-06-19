import { type Position, arcEndPoint } from '@retikz/math';
import type { DimensionRole } from './types';

/** polar 段内采样：相邻顶点间在 [θ, r] 空间插入的固定中间点数（每段定额，连续角轴弯弧） */
export const RETIKZ_POLAR_SEGMENT_SAMPLES = 16;

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
  | { kind: 'rect'; position: Position; width: number; height: number }
  | { kind: 'sector'; center: Position; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number }
  | { kind: 'contour'; points: Array<Position> };

/**
 * 读取 cell 在指定位置角色上的输出空间区间。
 * @description Cell 是按 coordinate role 存区间的稀疏对象；坐标帧只能读取自己声明的 roles。
 *   缺少对应 role 说明 mark 侧 cell 构造和 frame.projectCell 契约不一致，必须 fail-loud。
 */
export const cellInterval = (cell: Cell, role: DimensionRole): [number, number] => {
  const interval = cell.intervals[role];
  if (interval === undefined) throw new Error(`lowerPlots: cell is missing "${role}" interval`);
  return interval;
};

/**
 * 计算 contour 顶点集的 AABB 中心。
 * @description core contour Node 使用 position + 相对点集装配；plot 侧用同一个 AABB 中心作为 Node.position 与 locator anchor。
 *   少于 3 点无法形成可填充轮廓，返回 null，让 lowering 和 locator 走同一条跳过规则。
 */
export const contourAabbCenter = (points: ReadonlyArray<Position>): Position | null => {
  if (points.length < 3) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

/**
 * CellGeometry → 锚点屏幕位置；不可渲染的 contour 返回 null。
 * @description lowering 与 locator 共用这一判断，避免空 contour 在渲染侧被跳过、locator 侧却返回 NaN。
 */
export const cellGeometryAnchor = (geometry: CellGeometry): Position | null => {
  if (geometry.kind === 'rect') return geometry.position;
  if (geometry.kind === 'sector') {
    const midAngle = (geometry.startAngle + geometry.endAngle) / 2;
    const midRadius = (Math.min(geometry.innerRadius, geometry.outerRadius) + Math.max(geometry.innerRadius, geometry.outerRadius)) / 2;
    return arcEndPoint(geometry.center, midRadius, midAngle);
  }
  return contourAabbCenter(geometry.points);
};

/**
 * 判断 CellGeometry 是否能产出实际图元。
 * @description rect / sector 总能装配成 Node；contour 必须至少有 3 个点。所有 cell lowering 入口都应复用该判断，
 *   避免渲染侧跳过退化 contour、locator 或 reference 侧仍返回锚点。
 */
export const isRenderableCellGeometry = (geometry: CellGeometry): boolean => geometry.kind !== 'contour' || contourAabbCenter(geometry.points) !== null;

/**
 * densifyCellContour 选项：标记哪条位置轴是曲线（曲边每边 N 段，直边每边 1 段），并声明 cell 中的 primary / secondary 角色。
 */
export type DensifyCellContourOptions = {
  /** primary 输出区间所在角色；默认 x。 */
  primaryRole?: DimensionRole;
  /** secondary 输出区间所在角色；默认 y。 */
  secondaryRole?: DimensionRole;
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
 *   primaryRole / secondaryRole 默认 x/y，非 x/y 的二维自定义坐标系必须显式传入，避免 helper 误读 cell 区间。
 *   每条边只产「不含起点的中间点 + 终点」，避免相邻边重复顶点；首尾天然闭合（contour shape 隐式闭合，不重复首点）。
 */
export const densifyCellContour = (
  cell: Cell,
  projectFn: (primary: number, secondary: number) => Position | null,
  options?: DensifyCellContourOptions,
): Array<Position> => {
  const [p0, p1] = cellInterval(cell, options?.primaryRole ?? 'x');
  const [s0, s1] = cellInterval(cell, options?.secondaryRole ?? 'y');
  const primarySegments = options?.curvedPrimary ? RETIKZ_POLAR_SEGMENT_SAMPLES + 1 : 1;
  const secondarySegments = options?.curvedSecondary ? RETIKZ_POLAR_SEGMENT_SAMPLES + 1 : 1;
  const points: Array<Position> = [];
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
