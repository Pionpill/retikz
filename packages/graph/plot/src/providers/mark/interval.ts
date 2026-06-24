import { type IRChild, type IRNode, type IRScope } from '@retikz/core';
import { isFiniteNumber } from '@retikz/math';
import {
  type Cell,
  type CellGeometry,
  type ChannelValueResolver,
  type CoordinateFrame,
  type DimensionRole,
  type FieldCollector,
  type IntervalContext,
  type MarkChannels,
  type MarkDefinition,
  type MarkProvenance,
  type PositionScale,
  hasProjectCell,
  isRenderableCellGeometry,
} from '../../contract';
import { channelValue, inferCategoryDomain, resolveFieldPath } from '../data';
import {
  type CartesianCoordinateFrame,
  type PolarCoordinateFrame,
  isCartesianCoordinateFrame,
  isGenericCoordinateFrame,
  isPolarCoordinateFrame,
  isTernary2DCoordinateFrame,
} from '../coordinate';
import { type ExternalRow, type IntervalBound, IntervalBoundKind, type IntervalMark, type Mark, PlotCoordinate, PlotMark } from '../../schemas';
import { cellGeometryNode, cellLayer } from './cell';
import { channelForRole } from './roles';
import {
  type MarkPaint,
  applyNodeChannelDeliveries,
  attachDatumLabel,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectCommonEncodingFields,
  collectNodeChannelFields,
  decorateDatum,
  failLoudMessage,
  nodeChannelKinds,
} from './shared';

/**
 * 解析某 interval mark 在某位置 role 的有效区间来源（缺省推断）。
 * @description 显式 bounds 优先；省略时按惯例推断——primary（x）band、secondary（y）span(baseline 0)。
 *   lowering 与 scale 推断共用此单一真源，杜绝两处各推各的漂移。
 */
export const resolveIntervalBound = (mark: IntervalMark, role: DimensionRole): IntervalBound => {
  const explicit = (mark.bounds as Record<string, IntervalBound | undefined> | undefined)?.[role];
  if (explicit !== undefined) return explicit;
  return role === 'x' ? { kind: IntervalBoundKind.Band } : { kind: IntervalBoundKind.Span };
};

/**
 * 建某 interval mark 的摆放上下文（每 mark 一次；lowering 与 locator 同源）。
 * @description group 取自 bounds.x band 的 group 字段；据其切等分子带（dodge）。seriesRank / subWidth 走
 *   inferCategoryDomain（按数据序去重），与旧 dodge 同算法。
 */
export const buildIntervalContext = (mark: IntervalMark, frame: CartesianCoordinateFrame | PolarCoordinateFrame, rows: Array<ExternalRow>): IntervalContext => {
  const bandwidth = frame.primary.bandwidth;
  const xBound = resolveIntervalBound(mark, 'x');
  const group = xBound.kind === IntervalBoundKind.Band ? xBound.group : undefined;
  const seriesValues = group ? inferCategoryDomain(rows.map(row => resolveFieldPath(row, group))) : [];
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = bandwidth / subCount;
  return { bandwidth, group, seriesRank, subWidth };
};

/**
 * 建通用 frame 的 interval 摆放上下文；仅 `bounds.x=band{group}` 需要。
 * @description 自定义坐标系没有内置 primary scale 别名，group 子带宽从 `roleScales.x` 读取；
 *   不使用 group 时无需上下文，仍由各 role 的 scale 直接构造 cell。
 */
export const buildGenericIntervalContext = (mark: IntervalMark, frame: CoordinateFrame, rows: Array<ExternalRow>): IntervalContext | undefined => {
  const xBound = resolveIntervalBound(mark, 'x');
  const group = xBound.kind === IntervalBoundKind.Band ? xBound.group : undefined;
  if (group === undefined) return undefined;
  const scale = frame.roleScales?.x;
  if (!scale) {
    throw new Error(`lowerPlots: interval mark under the ${frame.type} coordinate system requires roleScales.x to build grouped band cells`);
  }
  const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, group)));
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = scale.bandwidth / subCount;
  return { bandwidth: scale.bandwidth, group, seriesRank, subWidth };
};

/** 取某行的 group 子带序号（值不在 rank 表 / 非标量 → 0，与 lowering 兜底一致）。 */
const subBandIndexOf = (ctx: IntervalContext, row: ExternalRow): number => {
  if (ctx.group === undefined) return 0;
  const series = resolveFieldPath(row, ctx.group);
  return (typeof series === 'string' || typeof series === 'number' ? ctx.seriesRank.get(series) : undefined) ?? 0;
};

/**
 * 把某 role 的 IntervalBound 解析成 scale 输出空间区间 [lo,hi]（cartesian=像素、polar=角度度 / 半径 user units）。
 * @description band：中心取位置通道、宽取 bandwidth（group 切子带，仅 primary）；span：baseline→值；
 *   extent：两字段（非有限 → fail-loud，保旧堆叠 / 扇形缺字段行为）；full：满铺该 role 坐标域。非有限 → null（跳过该行）。
 */
const boundOutputInterval = (
  bound: IntervalBound,
  axis: 'primary' | 'secondary',
  scale: PositionScale,
  mark: IntervalMark,
  row: ExternalRow,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
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
 * interval mark 某行 → 正交 cell（lowering 摆放与 locator 锚点的共享单一真源；坐标系无关）。
 * @description primary = bounds.x、secondary = bounds.y 各经 boundOutputInterval 解析。任一非有限 → null（跳过该行）；
 *   polar 下 primary（角度）或 secondary（半径）跨度退化（< 1e-9）→ null（与旧 sector / radial bar 守卫一致）。
 */
export const intervalCell = (mark: IntervalMark, row: ExternalRow, frame: CartesianCoordinateFrame | PolarCoordinateFrame, ctx: IntervalContext): Cell | null => {
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

/**
 * 读取 ternary interval 的 x/y/z 分量并归一化。
 * @description 三元坐标要求三项齐全、非负且和大于 0；缺通道或非法数值 fail-loud / 跳过，
 *   这样后续 bound 计算只面对 0..1 的稳定 barycentric 分量。
 */
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

/**
 * ternary interval 的单 role bound → 归一化分量区间。
 * @description ternary 没有 band 宽度语义，因此拒绝 band；span 从 baseline 到当前归一化分量；
 *   extent 直接读取用户字段，full 覆盖 0..1。非数值 extent fail-loud，避免生成不可解释的三元区域。
 */
const ternaryBoundOutputInterval = (
  bound: IntervalBound,
  role: 'x' | 'y' | 'z',
  mark: IntervalMark,
  row: ExternalRow,
  components: Record<'x' | 'y' | 'z', number>,
): [number, number] | null => {
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

/**
 * 通用坐标帧的 interval bound → role 输出空间区间。
 * @description 自定义 frame 若要支持 interval，必须同时提供 projectCell 与 roleScales；
 *   mark 侧只负责把 encoding/bounds 解析成正交 cell，最终几何仍交给 frame.projectCell。
 */
const genericBoundOutputInterval = (bound: IntervalBound, role: DimensionRole, mark: IntervalMark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): [number, number] | null => {
  const scale = frame.roleScales?.[role];
  if (!scale) {
    throw new Error(`lowerPlots: interval mark under the ${frame.type} coordinate system requires roleScales.${role} to build cells`);
  }
  const channel = channelForRole(mark, role);
  switch (bound.kind) {
    case IntervalBoundKind.Band: {
      const center = scale.coordinate(channelValue(channel, row));
      if (!Number.isFinite(center)) return null;
      if (role === 'x' && bound.group !== undefined) {
        if (ctx === undefined) {
          throw new Error(`lowerPlots: interval mark under the ${frame.type} coordinate system requires grouped band context for bounds.x.group`);
        }
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
        throw new Error(`lowerPlots: interval extent bound requires numeric ${bound.from} / ${bound.to} fields`);
      }
      const lo = scale.coordinate(rawLo);
      const hi = scale.coordinate(rawHi);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      return [lo, hi];
    }
    case IntervalBoundKind.Full:
      return scale.range();
  }
};

/** 带 projectCell 的通用坐标帧：按 frame.roles 和各 role scale 构造正交 cell。 */
const genericIntervalCell = (mark: IntervalMark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): Cell | null => {
  const intervals: Cell['intervals'] = {};
  for (const role of frame.roles) {
    const interval = genericBoundOutputInterval(resolveIntervalBound(mark, role), role, mark, row, frame, ctx);
    if (interval === null) return null;
    intervals[role] = interval;
  }
  return { intervals };
};

/**
 * ternary2D interval mark 的行 → 三元 cell。
 * @description 先把 x/y/z 原始分量归一化成和为 1 的 barycentric 分量，再按每个 role 的 bound 生成 cell intervals；
 *   返回的 cell 仍是坐标无关的逻辑区间，最终几何由 ternary frame.projectCell 决定。
 */
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

/**
 * 某 mark 的某行 → cell（坐标系相关）；非 interval mark / 退化行 → null。
 * @description interval → intervalCell（cartesian / polar）或 ternaryIntervalCell；其余 mark → null（非 cell 类）。
 *   interval 在无对应正交 cell 的坐标系（1D / 无 projectCell 的 custom）返回 null，由 mark.ts fail-loud。
 */
export const markCell = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): Cell | null => {
  if (mark.type !== PlotMark.Interval) return null;
  if (isTernary2DCoordinateFrame(frame)) return ternaryIntervalCell(mark, row);
  if (isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame)) return ctx ? intervalCell(mark, row, frame, ctx) : null;
  if (isGenericCoordinateFrame(frame) && hasProjectCell(frame)) return genericIntervalCell(mark, row, frame, ctx);
  return null;
};

/** interval cell 类 mark 某行的 series 值（写进 datum meta；series 字段拆分）。 */
const cellSeriesValue = (mark: Mark, row: ExternalRow): unknown =>
  mark.type === PlotMark.Interval && mark.series !== undefined ? resolveFieldPath(row, mark.series) : undefined;

/**
 * interval 单路径下沉：算 cell → frame.projectCell → CellGeometry → 装配 Node（坐标系无关）。
 * @description 判断挪进坐标系（frame.projectCell 产 rect / sector / contour），mark 侧零分叉。装配样式按 geometry
 *   kind 选（rect → 矩形 barStyle、sector / contour → shapeStyle）。无可绘制图元返回 null。
 */
const lowerCells = (
  mark: Mark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  projectCell: (cell: Cell) => CellGeometry,
  ctx: IntervalContext | undefined,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  channels: MarkChannels,
  markProvenance: MarkProvenance | undefined,
  labelOf: ChannelValueResolver<string> | undefined,
): IRScope | null => {
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  const fillOf = 'fill' in mark && mark.fill?.kind === 'field' && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = 'stroke' in mark && mark.stroke?.kind === 'field' ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  let kind: CellGeometry['kind'] | undefined;
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const cell = markCell(mark, row, frame, ctx);
    if (!cell) continue;
    const geometry = projectCell(cell);
    if (!isRenderableCellGeometry(geometry)) continue;
    kind = geometry.kind;
    const cellNode = cellGeometryNode(geometry);
    if (cellNode === null) continue;
    const fill = fillOf?.(row);
    if (fill !== undefined) cellNode.fill = fill;
    const stroke = strokeOf?.(row);
    if (stroke !== undefined) cellNode.stroke = stroke;
    applyNodeChannelDeliveries(cellNode, mark, row, channels, 'cell');
    const node = attachDatumLabel(
      decorateDatum(cellNode, row, transformedIndex, mark.type, markProvenance, cellSeriesValue(mark, row)),
      mark,
      row,
      labelOf,
    );
    placed.push({ color: colorOf?.(row), node });
  }
  const defaultFill = channelDefaultOf<MarkPaint>(channels, 'fill') ?? defaultColor ?? undefined;
  const defaultStroke = channelDefaultOf<MarkPaint>(channels, 'stroke');
  return placed.length === 0 || kind === undefined ? null : cellLayer(placed, kind, mark, colorOf, defaultFill, defaultStroke);
};

/** interval mark 图层下沉：坐标系守卫 + IntervalContext + lowerCells（cell 类单路径）。 */
export const lowerIntervalLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== PlotMark.Interval) return null;
  // interval 需要坐标帧提供 cell 几何投影；内置和自定义帧都走同一 projectCell 契约。
  if (!hasProjectCell(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const ctx = isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame) ? buildIntervalContext(mark, frame, rows) : isGenericCoordinateFrame(frame) ? buildGenericIntervalContext(mark, frame, rows) : undefined;
  const layer = lowerCells(
    mark,
    rows,
    frame,
    frame.projectCell,
    ctx,
    channelValueOf<string>(channels, 'color'),
    channelDefaultOf<string>(channels, 'color'),
    channels,
    markProvenance,
    channelValueOf<string>(channels, 'label'),
  );
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** 收集 interval mark 独有字段：series 分组与显式 extent bounds。 */
const collectIntervalChannelFields = (mark: IntervalMark, fields: FieldCollector): void => {
  fields.addField(mark.series);
  if (mark.bounds !== undefined) {
    for (const bound of Object.values(mark.bounds)) {
      if (bound.kind === 'extent') fields.addFields(bound.from, bound.to);
    }
  }
};

export const intervalMarkDefinition: MarkDefinition<IntervalMark> = {
  type: PlotMark.Interval,
  channelKinds: nodeChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectIntervalChannelFields(mark, fields);
  },
  buildCell: (mark, row, frame, ctx) => markCell(mark, row, frame, ctx),
  lower: lowerIntervalLayer,
};
