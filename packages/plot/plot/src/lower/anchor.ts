import { type Channel, type ExternalRow, type IntervalMark, type Mark, PlotCoordinate, PlotMark } from '../ir';
import { channelValue, isFiniteNumber, resolveFieldPath } from './field';
import type { CartesianFrame, CoordinateFrame, DimensionRole, PolarFrame } from './project';
import { inferCategoryDomain } from './scale';

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）
 * @description polar 的 angle/radius 复用 x/y 别名（encoding 只有 x/y）；ternary 的 a/b/c 各自取（ADR-03 加 PointEncoding 通道）。
 *   sector 无位置通道（角度来自累积界）→ undefined。
 */
export const channelForRole = (mark: Mark, role: DimensionRole): Channel | undefined => {
  if (mark.type === PlotMark.Sector) return undefined;
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
 * @description 每 mark 构造一次（buildIntervalContext），随后逐行调 intervalRect / intervalWedge 复用——
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
export const buildIntervalContext = (mark: IntervalMark, frame: CoordinateFrame, rows: Array<ExternalRow>): IntervalContext => {
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

/** 笛卡尔区间柱的几何：摆放位置（柱中心）+ 柱宽 / 柱高 */
export type IntervalRect = { position: [number, number]; width: number; height: number };

/**
 * 笛卡尔区间柱某行 → 矩形几何（lowering 摆放与 locator 锚点的共享单一真源）
 * @description EXACTLY 镜像 mark.ts 三变体：stacked → y0/y1 中点 + bandwidth；dodge（seriesField 设）→ subCenter + subWidth；
 *   plain → xCenter + bandwidth。任一非有限 → null（与 lowering 跳过守卫一致；stacked 缺字段返回 null，
 *   fail-loud 由 mark.ts 在调用前显式校验保留）。
 */
export const intervalRect = (mark: IntervalMark, row: ExternalRow, frame: CartesianFrame, ctx: IntervalContext): IntervalRect | null => {
  const yBase = frame.secondary.coordinate(BAR_BASELINE);
  if (!Number.isFinite(yBase)) return null;
  const xCenter = frame.primary.coordinate(channelValue(mark.encoding.x, row));
  if (!Number.isFinite(xCenter)) return null;

  if (ctx.stacked) {
    const v0 = resolveFieldPath(row, mark.y0Field ?? 'y0');
    const v1 = resolveFieldPath(row, mark.y1Field ?? 'y1');
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) return null;
    const top = frame.secondary.coordinate(v1);
    const bottom = frame.secondary.coordinate(v0);
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
    return { position: [xCenter, (top + bottom) / 2], width: ctx.bandwidth, height: Math.abs(top - bottom) };
  }

  const yValue = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
  if (!Number.isFinite(yValue)) return null;

  if (ctx.seriesField !== undefined) {
    const index = seriesIndexOf(ctx, row);
    const subCenter = xCenter - ctx.bandwidth / 2 + (index + 0.5) * ctx.subWidth;
    return { position: [subCenter, (yBase + yValue) / 2], width: ctx.subWidth, height: Math.abs(yBase - yValue) };
  }

  return { position: [xCenter, (yBase + yValue) / 2], width: ctx.bandwidth, height: Math.abs(yBase - yValue) };
};

/** 极坐标环楔几何：圆心 + 内外半径 + 起止角（度） */
export type Wedge = { center: [number, number]; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };

/**
 * 极坐标区间柱（径向柱 / 玫瑰）某行 → 环楔几何（lowering 摆放与 locator 锚点的共享单一真源）
 * @description EXACTLY 镜像 mark.ts lowerIntervalPolar：dodge（seriesField 设）→ 子角带（subStart = center − bw/2 + index·subWidth，
 *   endAngle = subStart + subWidth）；否则整角带 [center−bw/2, center+bw/2]。半径：stacked 读 y0/y1，否则 baseline → value。
 *   非有限 / 退化（零高）→ null（stacked 缺字段返回 null，fail-loud 由 mark.ts 调用前显式校验保留）。
 */
export const intervalWedge = (mark: IntervalMark, row: ExternalRow, frame: PolarFrame, ctx: IntervalContext): Wedge | null => {
  const center = frame.primary.coordinate(channelValue(mark.encoding.x, row));
  if (!Number.isFinite(center)) return null;

  let startAngle: number;
  let endAngle: number;
  if (ctx.seriesField !== undefined) {
    const index = seriesIndexOf(ctx, row);
    const subStart = center - ctx.bandwidth / 2 + index * ctx.subWidth;
    startAngle = subStart;
    endAngle = subStart + ctx.subWidth;
  } else {
    startAngle = center - ctx.bandwidth / 2;
    endAngle = center + ctx.bandwidth / 2;
  }

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
  return { center: frame.center, innerRadius, outerRadius, startAngle, endAngle };
};

/**
 * 扇片（sector mark，饼图 / 环图）某行 → 环楔几何（lowering 摆放与 locator 锚点的共享单一真源）
 * @description 镜像 mark.ts lowerSector：角度投影累积界 startField / endField，半径常量铺满 [innerRadius, outerRadius]。
 *   缺累积界 / 倒退（v1<v0）/ 零角 → null（mark.ts 在调用前显式校验对缺字段 / 倒退 fail-loud）。
 */
export const sectorWedge = (mark: Mark, row: ExternalRow, frame: PolarFrame): Wedge | null => {
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
  return { center: frame.center, innerRadius: frame.innerRadius, outerRadius: frame.outerRadius, startAngle, endAngle };
};

/**
 * 环楔 centroid 极投影：mid-angle θ=(start+end)/2、mid-radius r=(inner+outer)/2 → 屏幕点
 * @description 0°=+x、90°=+y、屏幕 y 向下（与 project.ts 同约定）；扇片几何中心 ≠ 圆心 Node.position，更适合命中 / 挂标签。
 */
export const wedgeCentroid = (wedge: Wedge): [number, number] => {
  const midAngle = ((wedge.startAngle + wedge.endAngle) / 2) * DEG_TO_RAD;
  const midRadius = (Math.min(wedge.innerRadius, wedge.outerRadius) + Math.max(wedge.innerRadius, wedge.outerRadius)) / 2;
  return [wedge.center[0] + midRadius * Math.cos(midAngle), wedge.center[1] + midRadius * Math.sin(midAngle)];
};

/**
 * 某 mark 的某行 → 锚点屏幕位置（locator 与 lowering 共享的单一几何真源）
 * @description 返回 [x, y] | null（null = 该行未被渲染 / 被跳过，命中预演与实际渲染一致）。
 *   sector → sectorWedge 的 centroid；interval polar → intervalWedge 的 centroid；
 *   interval cartesian → intervalRect 的 position（= lowered 柱 Node.position）；point / line / area → frame.project(x,y)。
 *   `ctx` 为 IntervalContext（interval mark 必传；其余 mark 传 undefined）。
 */
export const datumAnchor = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): [number, number] | null => {
  if (mark.type === PlotMark.Sector) {
    if (frame.type !== PlotCoordinate.Polar2D) return null;
    const wedge = sectorWedge(mark, row, frame);
    return wedge ? wedgeCentroid(wedge) : null;
  }
  if (mark.type === PlotMark.Interval) {
    if (ctx === undefined) return null;
    if (frame.type === PlotCoordinate.Polar2D) {
      const wedge = intervalWedge(mark, row, frame, ctx);
      return wedge ? wedgeCentroid(wedge) : null;
    }
    if (frame.type === PlotCoordinate.Cartesian2D) {
      const rect = intervalRect(mark, row, frame, ctx);
      return rect ? rect.position : null;
    }
    // interval 在 1D / ternary 无几何意义（lowerMark 已 fail-loud）；锚点同样无对应
    return null;
  }
  // point / line / area：按 frame.roles 序投影该行顶点（坐标系无关，1 / 2 / 3 通道统一走 projectRoles）
  return frame.projectRoles(roleValues(mark, row, frame));
};
