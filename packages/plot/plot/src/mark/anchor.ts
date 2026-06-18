import { type Channel, type ExternalRow, type IntervalBound, IntervalBoundKind, type IntervalMark, type LinkMark, type LinkOrientationValue, type Mark, PlotCoordinate, PlotMark } from '../ir';
import { channelValue, isFiniteNumber, resolveFieldPath } from '../data/field';
import { type CartesianCoordinate, type Cell, type CellGeometry, type DimensionRole, type PolarCoordinate, type ResolvedCoordinate, hasProjectCell } from '../coordinate';
import { type PositionScale, inferCategoryDomain } from '../scale/scale';

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）
 * @description polar 在坐标系内部把 x/y 解释为角向/径向；ternary 直接消费 x/y/z。
 *   link 无位置通道（端点来自 source/target 字段对）→ undefined。
 */
export const channelForRole = (mark: Mark, role: DimensionRole): Channel | undefined => {
  // link 无 encoding.x/y 位置通道（端点来自 source/target 字段对）→ undefined
  if (mark.type === PlotMark.Link) return undefined;
  switch (role) {
    case 'x':
      return mark.encoding.x;
    case 'y':
      return mark.encoding.y;
    case 'z':
      return 'z' in mark.encoding ? mark.encoding.z : undefined;
  }
};

/** 按 frame.roles 序取某 mark 某行的位置值数组（喂 frame.projectRoles；坐标系无关） */
export const roleValues = (mark: Mark, row: ExternalRow, frame: ResolvedCoordinate): Array<unknown> =>
  frame.roles.map(role => channelValue(channelForRole(mark, role), row));

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/**
 * 解析某 interval mark 在某位置 role 的有效区间来源（缺省推断）
 * @description 显式 bounds 优先；省略时按惯例推断——primary（x）band、secondary（y）span(baseline 0)。
 *   lowering 与 scale 推断共用此单一真源，杜绝两处各推各的漂移。
 */
export const resolveIntervalBound = (mark: IntervalMark, role: 'x' | 'y' | 'z'): IntervalBound => {
  const explicit = role === 'x' ? mark.bounds?.x : role === 'y' ? mark.bounds?.y : mark.bounds?.z;
  if (explicit !== undefined) return explicit;
  return role === 'x' ? { kind: IntervalBoundKind.Band } : { kind: IntervalBoundKind.Span };
};

/**
 * 区间柱（interval mark）摆放上下文：lowering 与 locator 共享的一次性派生量
 * @description 每 mark 构造一次（buildIntervalContext），随后逐行复用——把 band group 的子带划分
 *   （seriesRank / subWidth）收进一处，杜绝两处各算各的漂移。堆叠经 extent bounds 表达、不再走 ctx。
 */
export type IntervalContext = {
  /** 类别带宽（primary.bandwidth；group 切子带、plain 直接用） */
  bandwidth: number;
  /** band group 子带字段（bounds.x = band{group} 时有值；否则 undefined = 整带） */
  group?: string;
  /** group 值 → 子带序号（按数据序去重推断，与 lowering 一致） */
  seriesRank: Map<string | number, number>;
  /** 单子带宽（bandwidth / 子带数；无 group 下 = bandwidth） */
  subWidth: number;
};

/**
 * 建某 interval mark 的摆放上下文（每 mark 一次；lowering 与 locator 同源）
 * @description group 取自 bounds.x band 的 group 字段；据其切等分子带（dodge）。seriesRank / subWidth 走
 *   inferCategoryDomain（按数据序去重），与旧 dodge 同算法。
 */
export const buildIntervalContext = (mark: IntervalMark, frame: CartesianCoordinate | PolarCoordinate, rows: Array<ExternalRow>): IntervalContext => {
  const bandwidth = frame.primary.bandwidth;
  const xBound = resolveIntervalBound(mark, 'x');
  const group = xBound.kind === IntervalBoundKind.Band ? xBound.group : undefined;
  const seriesValues = group ? inferCategoryDomain(rows.map(row => resolveFieldPath(row, group))) : [];
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = bandwidth / subCount;
  return { bandwidth, group, seriesRank, subWidth };
};

/** 取某行的 group 子带序号（值不在 rank 表 / 非标量 → 0，与 lowering 兜底一致） */
const subBandIndexOf = (ctx: IntervalContext, row: ExternalRow): number => {
  if (ctx.group === undefined) return 0;
  const series = resolveFieldPath(row, ctx.group);
  return (typeof series === 'string' || typeof series === 'number' ? ctx.seriesRank.get(series) : undefined) ?? 0;
};

/**
 * 把某 role 的 IntervalBound 解析成 scale 输出空间区间 [lo,hi]（cartesian=像素、polar=角度度 / 半径 user units）
 * @description band：中心取位置通道、宽取 bandwidth（group 切子带，仅 primary）；span：baseline→值；
 *   extent：两字段（非有限 → fail-loud，保旧堆叠 / 扇形缺字段行为）；full：满铺该 role 坐标域。非有限 → null（跳过该行）。
 */
const boundOutputInterval = (
  bound: IntervalBound,
  axis: 'primary' | 'secondary',
  scale: PositionScale,
  mark: IntervalMark,
  row: ExternalRow,
  frame: CartesianCoordinate | PolarCoordinate,
  ctx: IntervalContext,
): [number, number] | null => {
  const channel = axis === 'primary' ? mark.encoding.x : mark.encoding.y;
  switch (bound.kind) {
    case IntervalBoundKind.Band: {
      const center = scale.coordinate(channelValue(channel, row));
      if (!Number.isFinite(center)) return null;
      if (axis === 'primary' && ctx.group !== undefined) {
        const index = subBandIndexOf(ctx, row);
        const start = center - ctx.bandwidth / 2 + index * ctx.subWidth;
        return [start, start + ctx.subWidth];
      }
      return [center - scale.bandwidth / 2, center + scale.bandwidth / 2];
    }
    case IntervalBoundKind.Span: {
      const base = scale.coordinate(bound.baseline ?? 0);
      const value = scale.coordinate(channelValue(channel, row));
      if (!Number.isFinite(base) || !Number.isFinite(value)) return null;
      return [base, value];
    }
    case IntervalBoundKind.Extent: {
      const rawLo = resolveFieldPath(row, bound.from);
      const rawHi = resolveFieldPath(row, bound.to);
      if (!isFiniteNumber(rawLo) || !isFiniteNumber(rawHi)) {
        throw new Error(`lowerPlots: interval extent bound requires numeric ${bound.from} / ${bound.to} fields (run the stack / bin / derive-interval transform first)`);
      }
      const lo = scale.coordinate(rawLo);
      const hi = scale.coordinate(rawHi);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      return [lo, hi];
    }
    case IntervalBoundKind.Full: {
      if (axis === 'secondary' && frame.type === PlotCoordinate.Polar2D) return [frame.innerRadius, frame.outerRadius];
      return scale.range();
    }
  }
};

/**
 * interval mark 某行 → 正交 cell（lowering 摆放与 locator 锚点的共享单一真源；坐标系无关）
 * @description primary = bounds.x、secondary = bounds.y 各经 boundOutputInterval 解析。任一非有限 → null（跳过该行）；
 *   polar 下 primary（角度）或 secondary（半径）跨度退化（< 1e-9）→ null（与旧 sector / radial bar 守卫一致）。
 */
export const intervalCell = (mark: IntervalMark, row: ExternalRow, frame: CartesianCoordinate | PolarCoordinate, ctx: IntervalContext): Cell | null => {
  const primary = boundOutputInterval(resolveIntervalBound(mark, 'x'), 'primary', frame.primary, mark, row, frame, ctx);
  if (primary === null) return null;
  const secondary = boundOutputInterval(resolveIntervalBound(mark, 'y'), 'secondary', frame.secondary, mark, row, frame, ctx);
  if (secondary === null) return null;
  if (frame.type === PlotCoordinate.Polar2D) {
    if (Math.abs(primary[1] - primary[0]) < 1e-9) return null;
    if (Math.abs(secondary[1] - secondary[0]) < 1e-9) return null;
  }
  return { intervals: { x: primary, y: secondary } };
};

const normalizedTernaryComponents = (mark: IntervalMark, row: ExternalRow): Record<'x' | 'y' | 'z', number> | null => {
  if (mark.encoding.x === undefined || mark.encoding.y === undefined || mark.encoding.z === undefined) {
    throw new Error('lowerPlots: ternary2D interval requires x, y, and z position channels');
  }
  const x = channelValue(mark.encoding.x, row);
  const y = channelValue(mark.encoding.y, row);
  const z = channelValue(mark.encoding.z, row);
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null;
  if (x < 0 || y < 0 || z < 0) {
    throw new Error(`lowerPlots: ternary interval requires non-negative components (got x=${x}, y=${y}, z=${z})`);
  }
  const sum = x + y + z;
  if (sum <= 0) {
    throw new Error(`lowerPlots: ternary interval requires x+y+z > 0 (got x=${x}, y=${y}, z=${z})`);
  }
  if (!Number.isFinite(sum)) {
    throw new Error(`lowerPlots: ternary interval components overflow when summed (got x=${x}, y=${y}, z=${z}); use proportions or smaller magnitudes`);
  }
  return { x: x / sum, y: y / sum, z: z / sum };
};

const ternaryBoundOutputInterval = (bound: IntervalBound, role: 'x' | 'y' | 'z', mark: IntervalMark, row: ExternalRow, components: Record<'x' | 'y' | 'z', number>): [number, number] | null => {
  switch (bound.kind) {
    case IntervalBoundKind.Band:
      throw new Error(`lowerPlots: ternary interval does not support band bounds on ${role}; use span, extent, or full`);
    case IntervalBoundKind.Span:
      return [bound.baseline ?? 0, components[role]];
    case IntervalBoundKind.Extent: {
      const lo = resolveFieldPath(row, bound.from);
      const hi = resolveFieldPath(row, bound.to);
      if (!isFiniteNumber(lo) || !isFiniteNumber(hi)) {
        throw new Error(`lowerPlots: ternary interval extent bound requires numeric ${bound.from} / ${bound.to} fields`);
      }
      return [lo, hi];
    }
    case IntervalBoundKind.Full:
      return [0, 1];
  }
};

export const ternaryIntervalCell = (mark: IntervalMark, row: ExternalRow): Cell | null => {
  const components = normalizedTernaryComponents(mark, row);
  if (components === null) return null;
  return {
    intervals: {
      x: ternaryBoundOutputInterval(resolveIntervalBound(mark, 'x'), 'x', mark, row, components) ?? [0, 0],
      y: ternaryBoundOutputInterval(resolveIntervalBound(mark, 'y'), 'y', mark, row, components) ?? [0, 0],
      z: ternaryBoundOutputInterval(resolveIntervalBound(mark, 'z'), 'z', mark, row, components) ?? [0, 0],
    },
  };
};

/** 点集 AABB 中心（contour 锚点 = 顶点环 AABB 中心，与 core contour shape 自动居中同源） */
const aabbCenterOf = (points: Array<[number, number]>): [number, number] => {
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
 * CellGeometry → 锚点屏幕位置（rect→position、sector→centroid、contour→顶点 AABB 中心）
 * @description locator 与 lowering 摆放同源：rect 锚点 = 矩形中心、sector 锚点 = 环楔几何 centroid
 *   （mid-angle × mid-radius，扇片几何中心 ≠ 圆心）、contour 锚点 = 顶点环 AABB 中心（= core contour Node.position）。
 */
export const cellGeometryAnchor = (geometry: CellGeometry): [number, number] => {
  if (geometry.kind === 'rect') return geometry.position;
  if (geometry.kind === 'sector') {
    const midAngle = ((geometry.startAngle + geometry.endAngle) / 2) * DEG_TO_RAD;
    const midRadius = (Math.min(geometry.innerRadius, geometry.outerRadius) + Math.max(geometry.innerRadius, geometry.outerRadius)) / 2;
    return [geometry.center[0] + midRadius * Math.cos(midAngle), geometry.center[1] + midRadius * Math.sin(midAngle)];
  }
  return aabbCenterOf(geometry.points);
};

/**
 * 某 mark 的某行 → cell（坐标系相关）；非 interval mark / 退化行 → null
 * @description interval → intervalCell（cartesian / polar）或 ternaryIntervalCell；其余 mark → null（非 cell 类）。
 *   interval 在无对应正交 cell 的坐标系（1D / 无 projectCell 的 custom）返回 null，由 mark.ts fail-loud。
 */
export const markCell = (mark: Mark, row: ExternalRow, frame: ResolvedCoordinate, ctx?: IntervalContext): Cell | null => {
  if (mark.type !== PlotMark.Interval) return null;
  if (frame.type === PlotCoordinate.Ternary2D) return ternaryIntervalCell(mark, row);
  if (ctx === undefined) return null;
  if (frame.type === PlotCoordinate.Cartesian2D || frame.type === PlotCoordinate.Polar2D) return intervalCell(mark, row, frame, ctx);
  return null;
};

/** link 默认 cubic 控制点沿主轴外推比例（curvature 缺省；0=准直、1=最 S）；与 d3 sankeyLinkHorizontal 0.5 同序 */
export const LINK_DEFAULT_CURVATURE = 0.5;

/** link 一行投影出的两端中心屏幕点（source / target 各经 frame.projectRoles）；任一端非有限 → null */
export type LinkEndpoints = { source: [number, number]; target: [number, number] };

/** link 一条带的几何：四角（封口两端各两点）+ 上 / 下边界 cubic 控制点（lowering 与 locator 单一真源） */
export type LinkBandGeometry = {
  /** 源端封口上角（S_top） */
  sourceTop: [number, number];
  /** 源端封口下角（S_bot） */
  sourceBottom: [number, number];
  /** 目标端封口上角（T_top） */
  targetTop: [number, number];
  /** 目标端封口下角（T_bot） */
  targetBottom: [number, number];
  /** 上边界 cubic（S_top→T_top）首控制点 */
  topControl1: [number, number];
  /** 上边界 cubic（S_top→T_top）末控制点 */
  topControl2: [number, number];
  /** 下边界 cubic（T_bot→S_bot）首控制点 */
  bottomControl1: [number, number];
  /** 下边界 cubic（T_bot→S_bot）末控制点 */
  bottomControl2: [number, number];
};

/** 取 link 一行某端点（source / target 字段对）经 frame.projectRoles 投影出的屏幕中心点；非有限 → null */
export const linkEndpointPoint = (endpoint: { x: Channel; y: Channel }, row: ExternalRow, frame: ResolvedCoordinate): [number, number] | null =>
  frame.projectRoles([channelValue(endpoint.x, row), channelValue(endpoint.y, row)]);

/** 取 link 一行源 / 目标两端中心点（任一端非有限 → null，整行跳过） */
export const linkEndpoints = (mark: LinkMark, row: ExternalRow, frame: ResolvedCoordinate): LinkEndpoints | null => {
  const source = linkEndpointPoint(mark.source, row, frame);
  const target = linkEndpointPoint(mark.target, row, frame);
  if (source === null || target === null) return null;
  return { source, target };
};

/**
 * 由源 / 目标中心 + 各端半宽 + curvature + orientation 算出一条带的四角与上 / 下边界 cubic 控制点（lowering / locator 单一真源）
 * @description 出 / 入切向沿 orientation 轴（horizontal → 主轴 (1,0)、垂向 (0,1)；vertical → 主轴 (0,1)、垂向 (1,0)），
 *   半宽沿垂向 normal；外推向量 e = mainUnit × (curvature × Δmain)。退化（源目标重合，|T−S|<ε）→ null（零长带跳过）。
 */
export const linkBandGeometry = (
  source: [number, number],
  target: [number, number],
  halfSource: number,
  halfTarget: number,
  curvature: number,
  orientation: LinkOrientationValue,
): LinkBandGeometry | null => {
  if (!(Math.hypot(target[0] - source[0], target[1] - source[1]) > 1e-9)) return null;
  const horizontal = orientation === 'horizontal';
  const mainX = horizontal ? 1 : 0;
  const mainY = horizontal ? 0 : 1;
  const normalX = horizontal ? 0 : 1;
  const normalY = horizontal ? 1 : 0;
  const sourceTop: [number, number] = [source[0] + halfSource * normalX, source[1] + halfSource * normalY];
  const sourceBottom: [number, number] = [source[0] - halfSource * normalX, source[1] - halfSource * normalY];
  const targetTop: [number, number] = [target[0] + halfTarget * normalX, target[1] + halfTarget * normalY];
  const targetBottom: [number, number] = [target[0] - halfTarget * normalX, target[1] - halfTarget * normalY];
  const deltaMain = (target[0] - source[0]) * mainX + (target[1] - source[1]) * mainY;
  const reach = curvature * deltaMain;
  const ex = mainX * reach;
  const ey = mainY * reach;
  return {
    sourceTop,
    sourceBottom,
    targetTop,
    targetBottom,
    topControl1: [sourceTop[0] + ex, sourceTop[1] + ey],
    topControl2: [targetTop[0] - ex, targetTop[1] - ey],
    bottomControl1: [targetBottom[0] - ex, targetBottom[1] - ey],
    bottomControl2: [sourceBottom[0] + ex, sourceBottom[1] + ey],
  };
};

/**
 * 某 mark 的某行 → 锚点屏幕位置（locator 与 lowering 共享的单一几何真源）
 * @description 返回 [x, y] | null（null = 该行未被渲染 / 被跳过，命中预演与实际渲染一致）。
 *   interval → markCell → frame.projectCell → cellGeometryAnchor；link → 两端中点；point / path / region → frame.projectRoles。
 *   `ctx` 为 IntervalContext（interval mark 必传；其余 mark 传 undefined）。
 */
export const datumAnchor = (mark: Mark, row: ExternalRow, frame: ResolvedCoordinate, ctx?: IntervalContext): [number, number] | null => {
  if (mark.type === PlotMark.Interval) {
    if (!hasProjectCell(frame)) return null;
    const cell = markCell(mark, row, frame, ctx);
    return cell ? cellGeometryAnchor(frame.projectCell(cell)) : null;
  }
  // link：一行一带，锚点取带中线中点（源中心 ↔ 目标中心连线中点），与 lowering 同源；任一端非有限 → null
  if (mark.type === PlotMark.Link) {
    const endpoints = linkEndpoints(mark, row, frame);
    return endpoints ? [(endpoints.source[0] + endpoints.target[0]) / 2, (endpoints.source[1] + endpoints.target[1]) / 2] : null;
  }
  // point / path / region：按 frame.roles 序投影该行顶点（坐标系无关，1 / 2 / 3 通道统一走 projectRoles）
  return frame.projectRoles(roleValues(mark, row, frame));
};
