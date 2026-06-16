import { type Channel, type ExternalRow, type IntervalMark, type Mark, PlotCoordinate, PlotMark, type RectMark, type RibbonMark } from '../ir';
import { channelValue, isFiniteNumber, resolveFieldPath } from './field';
import type { CartesianFrame, Cell, CellGeometry, CoordinateFrame, DimensionRole, PolarFrame } from './project';
import { inferCategoryDomain } from './scale';

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）
 * @description polar 的 angle/radius 复用 x/y 别名（encoding 只有 x/y）；ternary 的 a/b/c 各自取（ADR-03 加 PointEncoding 通道）。
 *   sector 无位置通道（角度来自累积界）→ undefined。
 */
export const channelForRole = (mark: Mark, role: DimensionRole): Channel | undefined => {
  // sector / ribbon 无 encoding.x/y 位置通道（sector 角度来自累积界；ribbon 端点来自 source/target 字段对）→ undefined
  if (mark.type === PlotMark.Sector || mark.type === PlotMark.Ribbon) return undefined;
  switch (role) {
    case 'x':
    case 'angle':
      return mark.encoding.x;
    case 'y':
    case 'radius':
      return mark.encoding.y;
    case 'a':
    case 'b':
    case 'c':
      // ternary a/b/c 通道由 ADR-03 加入 PointEncoding；在此前的坐标系不产生这些角色
      return 'a' in mark.encoding ? (mark.encoding as Record<'a' | 'b' | 'c', Channel | undefined>)[role] : undefined;
  }
};

/** 按 frame.roles 序取某 mark 某行的位置值数组（喂 frame.projectRoles；坐标系无关） */
export const roleValues = (mark: Mark, row: ExternalRow, frame: CoordinateFrame): Array<unknown> =>
  frame.roles.map(role => channelValue(channelForRole(mark, role), row));

/** 柱默认 baseline（与 mark.ts 的 BAR_BASELINE 一致；锚点 / 摆放共享单一真源需对齐） */
const BAR_BASELINE = 0;

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/**
 * 区间柱（interval mark）摆放上下文：lowering 与 locator 共享的一次性派生量
 * @description 每 mark 构造一次（buildIntervalContext），随后逐行调 intervalCellCartesian / intervalCellPolar 复用——
 *   把 series-dodge 的子带划分（seriesRank / subWidth）与 stack 判定收进一处，杜绝两处各算各的漂移。
 */
export type IntervalContext = {
  /** 类别带宽（primary.bandwidth；dodge 切子带、plain / stack 直接用） */
  bandwidth: number;
  /** 是否堆叠（arrangement === 'stack'）；堆叠读 y0 / y1，关掉 series-dodge */
  stacked: boolean;
  /** dodge 的系列字段（非堆叠且 mark.series 设时有值；否则 undefined = plain） */
  seriesField?: string;
  /** 系列值 → 子带序号（按数据序去重推断，与 lowering 一致） */
  seriesRank: Map<string | number, number>;
  /** 单系列子带宽（bandwidth / 系列数；plain / stack 下 = bandwidth） */
  subWidth: number;
};

/**
 * 建某 interval mark 的摆放上下文（每 mark 一次；lowering 与 locator 同源）
 * @description stacked = arrangement==='stack'；seriesField 仅非堆叠且 mark.series 设时取，dodge 据其切等分子角 / 子带。
 *   seriesRank / subWidth 走 inferCategoryDomain（按数据序去重），与 mark.ts 旧 lowerDodgedBars / lowerIntervalPolar 同算法。
 */
export const buildIntervalContext = (mark: IntervalMark, frame: CartesianFrame | PolarFrame, rows: Array<ExternalRow>): IntervalContext => {
  const bandwidth = frame.primary.bandwidth;
  const stacked = mark.arrangement === 'stack';
  const seriesField = !stacked ? mark.series : undefined;
  const seriesValues = seriesField ? inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField))) : [];
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = bandwidth / subCount;
  return { bandwidth, stacked, seriesField, seriesRank, subWidth };
};

/** 取某行的系列子带序号（系列值不在 rank 表 / 非标量 → 0，与 lowering 兜底一致） */
const seriesIndexOf = (ctx: IntervalContext, row: ExternalRow): number => {
  if (ctx.seriesField === undefined) return 0;
  const series = resolveFieldPath(row, ctx.seriesField);
  return (typeof series === 'string' || typeof series === 'number' ? ctx.seriesRank.get(series) : undefined) ?? 0;
};

/**
 * 区间柱某行的 primary 输出区间（角带 / 像素带）：plain / dodge 共享算法（cartesian = x 像素、polar = 角度）
 * @description center = frame.primary.coordinate(x)；plain → [center−bw/2, center+bw/2]；dodge（seriesField 设）
 *   → 子带 [center−bw/2+index·subWidth, +subWidth]（cartesian subCenter±subWidth/2 与此等价）。center 非有限 → null。
 */
const intervalPrimaryBand = (mark: IntervalMark, row: ExternalRow, frame: CartesianFrame | PolarFrame, ctx: IntervalContext): [number, number] | null => {
  const center = frame.primary.coordinate(channelValue(mark.encoding.x, row));
  if (!Number.isFinite(center)) return null;
  if (ctx.seriesField !== undefined) {
    const index = seriesIndexOf(ctx, row);
    const start = center - ctx.bandwidth / 2 + index * ctx.subWidth;
    return [start, start + ctx.subWidth];
  }
  return [center - ctx.bandwidth / 2, center + ctx.bandwidth / 2];
};

/**
 * 笛卡尔区间柱某行 → 正交 cell（lowering 摆放与 locator 锚点的共享单一真源）
 * @description primary = x 像素带（intervalPrimaryBand）；secondary = stacked 读 y0/y1 像素 [bottom,top]、否则 [yBase,yValue]。
 *   任一非有限 → null（与 lowering 跳过守卫一致；stacked 缺字段返回 null，fail-loud 由 mark.ts 调用前显式校验保留）。
 */
export const intervalCellCartesian = (mark: IntervalMark, row: ExternalRow, frame: CartesianFrame, ctx: IntervalContext): Cell | null => {
  const yBase = frame.secondary.coordinate(BAR_BASELINE);
  if (!Number.isFinite(yBase)) return null;
  const primary = intervalPrimaryBand(mark, row, frame, ctx);
  if (primary === null) return null;

  if (ctx.stacked) {
    const v0 = resolveFieldPath(row, mark.y0Field ?? 'y0');
    const v1 = resolveFieldPath(row, mark.y1Field ?? 'y1');
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) return null;
    const top = frame.secondary.coordinate(v1);
    const bottom = frame.secondary.coordinate(v0);
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
    return { primary, secondary: [bottom, top] };
  }

  const yValue = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
  if (!Number.isFinite(yValue)) return null;
  return { primary, secondary: [yBase, yValue] };
};

/**
 * 极坐标区间柱（径向柱 / 玫瑰）某行 → 正交 cell（lowering 摆放与 locator 锚点的共享单一真源）
 * @description primary = 角带（intervalPrimaryBand）；secondary = stacked 读 y0/y1 半径、否则 [baseline 半径, value 半径]。
 *   非有限 / 退化（零半径跨）→ null（stacked 缺字段返回 null，fail-loud 由 mark.ts 调用前显式校验保留）。
 */
export const intervalCellPolar = (mark: IntervalMark, row: ExternalRow, frame: PolarFrame, ctx: IntervalContext): Cell | null => {
  const primary = intervalPrimaryBand(mark, row, frame, ctx);
  if (primary === null) return null;

  let innerRadius: number;
  let outerRadius: number;
  if (ctx.stacked) {
    const v0 = resolveFieldPath(row, mark.y0Field ?? 'y0');
    const v1 = resolveFieldPath(row, mark.y1Field ?? 'y1');
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) return null;
    innerRadius = frame.secondary.coordinate(v0);
    outerRadius = frame.secondary.coordinate(v1);
  } else {
    innerRadius = frame.secondary.coordinate(BAR_BASELINE);
    outerRadius = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
  }
  if (!Number.isFinite(innerRadius) || !Number.isFinite(outerRadius)) return null;
  if (Math.max(innerRadius, outerRadius) - Math.min(innerRadius, outerRadius) < 1e-9) return null;
  return { primary, secondary: [innerRadius, outerRadius] };
};

/**
 * 扇片（sector mark，饼图 / 环图）某行 → 正交 cell（lowering 摆放与 locator 锚点的共享单一真源）
 * @description primary = 累积角界 [coordinate(v0), coordinate(v1)]（startField / endField）；secondary = 常量半径
 *   [innerRadius, outerRadius] 满铺。缺累积界 / 倒退（v1<v0）/ 零角 → null（mark.ts 调用前显式校验对缺字段 / 倒退 fail-loud）。
 */
export const sectorCell = (mark: Mark, row: ExternalRow, frame: PolarFrame): Cell | null => {
  if (mark.type !== PlotMark.Sector) return null;
  const startField = mark.startField ?? 'y0';
  const endField = mark.endField ?? 'y1';
  const v0 = resolveFieldPath(row, startField);
  const v1 = resolveFieldPath(row, endField);
  if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) return null;
  if (v1 < v0) return null;
  const startAngle = frame.primary.coordinate(v0);
  const endAngle = frame.primary.coordinate(v1);
  if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) return null;
  if (Math.abs(endAngle - startAngle) < 1e-9) return null;
  return { primary: [startAngle, endAngle], secondary: [frame.innerRadius, frame.outerRadius] };
};

/**
 * 矩形格（rect mark，heatmap）某行 → 双 band 正交 cell（lowering 摆放与 locator 锚点的共享单一真源）
 * @description primary = x band 带 [xCenter − bw_x/2, xCenter + bw_x/2]、secondary = y band 带
 *   [yCenter − bw_y/2, yCenter + bw_y/2]，bw_x / bw_y 取 frame.primary / frame.secondary 的 bandwidth。
 *   中心非有限（缺类别 / 非 band scale 取不到中心）→ null（跳过该格，与 interval 跳过守卫一致）。
 *   secondary 非 band（bandwidth ≤ 0）的 fail-loud 由 mark.ts 调用前显式校验保留（cell 仅做几何）。
 */
export const rectCell = (mark: RectMark, row: ExternalRow, frame: CartesianFrame): Cell | null => {
  const xCenter = frame.primary.coordinate(channelValue(mark.encoding.x, row));
  const yCenter = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
  if (!Number.isFinite(xCenter) || !Number.isFinite(yCenter)) return null;
  const halfX = frame.primary.bandwidth / 2;
  const halfY = frame.secondary.bandwidth / 2;
  return { primary: [xCenter - halfX, xCenter + halfX], secondary: [yCenter - halfY, yCenter + halfY] };
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
 * 某 mark 的某行 → cell（坐标系相关）；非 cell 类 mark / 退化行 → null
 * @description sector → sectorCell（polar）；interval → cartesian / polar cell；rect → cartesian 双 band cell；其余 mark → null（非 cell 类）。
 *   cell 类 mark 在无对应正交 cell 的坐标系（1D / ternary / 无 projectCell 的 custom）返回 null，由 mark.ts fail-loud。
 */
export const markCell = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): Cell | null => {
  if (mark.type === PlotMark.Sector) {
    if (frame.type !== PlotCoordinate.Polar2D) return null;
    return sectorCell(mark, row, frame);
  }
  if (mark.type === PlotMark.Interval) {
    if (ctx === undefined) return null;
    if (frame.type === PlotCoordinate.Cartesian2D) return intervalCellCartesian(mark, row, frame, ctx);
    if (frame.type === PlotCoordinate.Polar2D) return intervalCellPolar(mark, row, frame, ctx);
    return null;
  }
  if (mark.type === PlotMark.Rect) {
    if (frame.type !== PlotCoordinate.Cartesian2D) return null;
    return rectCell(mark, row, frame);
  }
  return null;
};

/** ribbon 默认 cubic 控制点沿主轴外推比例（curvature 缺省；0=准直、1=最 S）；与 d3 sankeyLinkHorizontal 0.5 同序 */
export const RIBBON_DEFAULT_CURVATURE = 0.5;

/** ribbon 一行投影出的两端中心屏幕点（source / target 各经 frame.projectRoles）；任一端非有限 → null */
export type RibbonEndpoints = { source: [number, number]; target: [number, number] };

/** ribbon 一条带的几何：四角（封口两端各两点）+ 上 / 下边界 cubic 控制点（lowering 与 locator 单一真源） */
export type RibbonBandGeometry = {
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

/** 取 ribbon 一行某端点（source / target 字段对）经 frame.projectRoles 投影出的屏幕中心点；非有限 → null */
export const ribbonEndpointPoint = (endpoint: { x: Channel; y: Channel }, row: ExternalRow, frame: CoordinateFrame): [number, number] | null =>
  frame.projectRoles([channelValue(endpoint.x, row), channelValue(endpoint.y, row)]);

/** 取 ribbon 一行源 / 目标两端中心点（任一端非有限 → null，整行跳过） */
export const ribbonEndpoints = (mark: RibbonMark, row: ExternalRow, frame: CoordinateFrame): RibbonEndpoints | null => {
  const source = ribbonEndpointPoint(mark.source, row, frame);
  const target = ribbonEndpointPoint(mark.target, row, frame);
  if (source === null || target === null) return null;
  return { source, target };
};

/**
 * 由源 / 目标中心 + 各端半宽 + curvature 算出一条带的四角与上 / 下边界 cubic 控制点（lowering / locator 单一真源）
 * @description 半宽法向取「源→目标弦方向」的法向（本轮弦法向近似，精确端切向法向列为后续；见 ADR-05 不在范围）：
 *   弦单位向量 u = (T−S)/|T−S|、法向 n = (−u.y, u.x)；S_top = S + halfSource·n、S_bot = S − halfSource·n、
 *   T_top = T + halfTarget·n、T_bot = T − halfTarget·n。上 / 下边界 cubic 控制点沿弦主轴分量按 curvature 外推
 *   （control1 在源端沿 +u、control2 在目标端沿 −u，幅度 = curvature × Δmain），纯水平 sankey 退化成 d3 S 形；
 *   curvature=0 → 控制点贴端点（准直带）。退化（源目标重合，|T−S|<ε）→ null（零长带跳过）。
 */
export const ribbonBandGeometry = (source: [number, number], target: [number, number], halfSource: number, halfTarget: number, curvature: number): RibbonBandGeometry | null => {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  const length = Math.hypot(dx, dy);
  if (!(length > 1e-9)) return null;
  const ux = dx / length;
  const uy = dy / length;
  // 弦法向（逆时针 90°）
  const nx = -uy;
  const ny = ux;
  const sourceTop: [number, number] = [source[0] + halfSource * nx, source[1] + halfSource * ny];
  const sourceBottom: [number, number] = [source[0] - halfSource * nx, source[1] - halfSource * ny];
  const targetTop: [number, number] = [target[0] + halfTarget * nx, target[1] + halfTarget * ny];
  const targetBottom: [number, number] = [target[0] - halfTarget * nx, target[1] - halfTarget * ny];
  // 主轴外推幅度：沿弦方向 curvature × 弦长（control1 从源端 +u 推、control2 从目标端 −u 推）
  const reach = curvature * length;
  const ex = ux * reach;
  const ey = uy * reach;
  return {
    sourceTop,
    sourceBottom,
    targetTop,
    targetBottom,
    // 上边界 S_top→T_top
    topControl1: [sourceTop[0] + ex, sourceTop[1] + ey],
    topControl2: [targetTop[0] - ex, targetTop[1] - ey],
    // 下边界 T_bot→S_bot（反向：control1 在目标端 −u、control2 在源端 +u）
    bottomControl1: [targetBottom[0] - ex, targetBottom[1] - ey],
    bottomControl2: [sourceBottom[0] + ex, sourceBottom[1] + ey],
  };
};

/**
 * 某 mark 的某行 → 锚点屏幕位置（locator 与 lowering 共享的单一几何真源）
 * @description 返回 [x, y] | null（null = 该行未被渲染 / 被跳过，命中预演与实际渲染一致）。
 *   cell 类 mark（interval / sector）→ markCell → frame.projectCell → cellGeometryAnchor（与 lowered Node 摆放同源）；
 *   point / line / area → frame.project(x,y)。`ctx` 为 IntervalContext（interval mark 必传；其余 mark 传 undefined）。
 *   坐标系无 projectCell（1D / ternary / 无 projectCell 的 custom）→ cell 类 mark 无锚点（null，lowerMark 已 fail-loud）。
 */
export const datumAnchor = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): [number, number] | null => {
  if (mark.type === PlotMark.Sector || mark.type === PlotMark.Interval || mark.type === PlotMark.Rect) {
    if (frame.projectCell === undefined) return null;
    const cell = markCell(mark, row, frame, ctx);
    return cell ? cellGeometryAnchor(frame.projectCell(cell)) : null;
  }
  // ribbon：一行一带，锚点取带中线中点（源中心 ↔ 目标中心连线中点），与 lowering 同源；任一端非有限 → null
  if (mark.type === PlotMark.Ribbon) {
    const endpoints = ribbonEndpoints(mark, row, frame);
    return endpoints ? [(endpoints.source[0] + endpoints.target[0]) / 2, (endpoints.source[1] + endpoints.target[1]) / 2] : null;
  }
  // point / line / area：按 frame.roles 序投影该行顶点（坐标系无关，1 / 2 / 3 通道统一走 projectRoles）
  return frame.projectRoles(roleValues(mark, row, frame));
};
