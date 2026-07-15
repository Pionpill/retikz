import type { ExternalRow } from '@retikz/data';

import { type IRChild, type IRNode, type IRNodeLabel, type IRScope } from '@retikz/core';
import { inferCategoryDomain, resolveFieldPath } from '@retikz/data';
import { arcEndPoint, DEFAULT_EPSILON, isFiniteNumber } from '@retikz/math';

import type {
  Cell,
  CellGeometry,
  ChannelValueResolver,
  CoordinateFrame,
  DimensionRole,
  FieldCollector,
  IntervalContext,
  MarkChannels,
  MarkDefinition,
  MarkLoweringContext,
  PositionScale,
} from '../../../contract';
import type { PolarCoordinateFrame } from '../../../contract';
import type { IRPlotIntervalBound, IRPlotIntervalMark, IRPlotMark } from '../../../schemas';
import type { CartesianCoordinateFrame } from '../../coordinate';
import type { MarkPaint } from '../shared';

import { hasProjectCell, isRenderableCellGeometry } from '../../../contract';
import { IntervalBoundKind, IntervalMarkSchema, PlotCoordinate, PlotMark } from '../../../schemas';
import { channelValue } from '../../channel/shared';
import {
  isCartesianCoordinateFrame,
  isGenericCoordinateFrame,
  isPolarCoordinateFrame,
  isTernary2DCoordinateFrame,
} from '../../coordinate';
import { cellGeometryNode, cellLayer } from '../private';
import { channelForRole } from '../shared';
import {
  applyNodeChannelDeliveries,
  attachDatumAnchor,
  attachDatumLabel,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectCommonEncodingFields,
  collectNodeChannelFields,
  decorateDatum,
  failLoudMessage,
  nodeChannelKinds,
} from '../shared';

type IntervalRoleContext = NonNullable<IntervalContext['byRole'][string]>;

/**
 * 解析某 interval mark 在某位置 role 的有效区间来源（缺省推断）。
 * @description 显式 bounds 优先；省略时按惯例推断——primary（x）band、secondary（y）span(baseline 0)。
 *   lowering 与 scale 推断共用此单一真源，杜绝两处各推各的漂移
 */
export const resolveIntervalBound = (mark: IRPlotIntervalMark, role: DimensionRole): IRPlotIntervalBound => {
  const explicit = (mark.bounds as Record<string, IRPlotIntervalBound | undefined> | undefined)?.[role];
  if (explicit !== undefined) return explicit;
  return role === 'x' ? { kind: IntervalBoundKind.Band } : { kind: IntervalBoundKind.Span };
};

/**
 * 建某 band role 的摆放上下文（每 mark 每 role 一次；lowering 与 locator 同源）。
 * @description group 取自 bounds.<role> band 的 group 字段；据其切等分子带（dodge）。
 *   seriesRank / subWidth 走 inferCategoryDomain（按数据序去重），与旧 dodge 同算法
 */
const buildBandContext = (
  bandwidth: number,
  group: string | undefined,
  rows: Array<ExternalRow>,
): IntervalRoleContext => {
  const seriesValues = group ? inferCategoryDomain(rows.map(row => resolveFieldPath(row, group))) : [];
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = bandwidth / subCount;
  return { bandwidth, group, seriesRank, subWidth };
};

const assertProportionalWidth = (field: string, value: unknown): number | null => {
  if (!isFiniteNumber(value)) return null;
  if (value < 0) {
    throw new Error(`lowerPlots: interval proportional bound requires a non-negative numeric ${field} field`);
  }
  return value;
};

/** 按数据权重构造每行对应的比例累计区间。 */
export const buildProportionalIntervals = (
  field: string,
  rows: Array<ExternalRow>,
): Map<ExternalRow, [number, number]> => {
  let cursor = 0;
  const intervals = new Map<ExternalRow, [number, number]>();
  for (const row of rows) {
    const width = assertProportionalWidth(field, resolveFieldPath(row, field));
    if (width === null) {
      intervals.set(row, [Number.NaN, Number.NaN]);
      continue;
    }
    const next = cursor + width;
    if (!Number.isFinite(next)) {
      throw new Error(
        `lowerPlots: interval proportional bound overflows while accumulating ${field}; use smaller magnitudes`,
      );
    }
    intervals.set(row, [cursor, next]);
    cursor = next;
  }
  return intervals;
};

/** 收集比例区间需要贡献给位置比例尺的域值。 */
export const proportionalIntervalDomainValues = (field: string, rows: Array<ExternalRow>): Array<number> => {
  const values: Array<number> = [0];
  let cursor = 0;
  for (const row of rows) {
    const width = assertProportionalWidth(field, resolveFieldPath(row, field));
    if (width === null) continue;
    const next = cursor + width;
    if (!Number.isFinite(next)) {
      throw new Error(
        `lowerPlots: interval proportional bound overflows while accumulating ${field}; use smaller magnitudes`,
      );
    }
    values.push(cursor, next);
    cursor = next;
  }
  return values;
};

const buildProportionalContext = (
  mark: IRPlotIntervalMark,
  roles: ReadonlyArray<DimensionRole>,
  rows: Array<ExternalRow>,
): IntervalContext['proportionalByRole'] => {
  const byRole: NonNullable<IntervalContext['proportionalByRole']> = {};
  for (const role of roles) {
    const bound = resolveIntervalBound(mark, role);
    if (bound.kind === IntervalBoundKind.Proportional) byRole[role] = buildProportionalIntervals(bound.field, rows);
  }
  return Object.values(byRole)[0] === undefined ? undefined : byRole;
};

/**
 * 建某 interval mark 的摆放上下文（每 mark 一次；lowering 与 locator 同源）。
 * @description 内置 cartesian / polar frame 有固定 x/y role，因此总能建立 role band 上下文；
 *   generic frame 只在 `bounds.<role>=band{group}` 时需要上下文，其余 interval 直接由 roleScales 构造 cell。
 */
export const buildIntervalContext = (
  mark: IRPlotIntervalMark,
  frame: CoordinateFrame,
  rows: Array<ExternalRow>,
): IntervalContext | undefined => {
  if (isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame)) {
    const xBound = resolveIntervalBound(mark, 'x');
    const yBound = resolveIntervalBound(mark, 'y');
    const xContext = buildBandContext(
      frame.primary.bandwidth,
      xBound.kind === IntervalBoundKind.Band ? xBound.group : undefined,
      rows,
    );
    const yContext = buildBandContext(
      frame.secondary.bandwidth,
      yBound.kind === IntervalBoundKind.Band ? yBound.group : undefined,
      rows,
    );
    const proportionalByRole = buildProportionalContext(mark, ['x', 'y'], rows);
    return {
      byRole: { x: xContext, y: yContext },
      ...(proportionalByRole !== undefined ? { proportionalByRole } : {}),
    };
  }
  if (isGenericCoordinateFrame(frame)) {
    const byRole: IntervalContext['byRole'] = {};
    const proportionalByRole = buildProportionalContext(mark, frame.roles, rows);
    for (const role of frame.roles) {
      const bound = resolveIntervalBound(mark, role);
      const group = bound.kind === IntervalBoundKind.Band ? bound.group : undefined;
      if (group === undefined) continue;
      const scale = frame.roleScales?.[role];
      if (!scale) {
        throw new Error(
          `lowerPlots: interval mark under the ${frame.type} coordinate system requires roleScales.${role} to build grouped band cells`,
        );
      }
      byRole[role] = buildBandContext(scale.bandwidth, group, rows);
    }
    return Object.values(byRole)[0] === undefined && proportionalByRole === undefined
      ? undefined
      : { byRole, ...(proportionalByRole !== undefined ? { proportionalByRole } : {}) };
  }
  return undefined;
};

/** 取某行的 group 子带序号（值不在 rank 表 / 非标量 → 0，与 lowering 兜底一致）。 */
const subBandIndexOf = (ctx: IntervalRoleContext, row: ExternalRow): number => {
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
  bound: IRPlotIntervalBound,
  axis: 'primary' | 'secondary',
  scale: PositionScale,
  mark: IRPlotIntervalMark,
  row: ExternalRow,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  ctx: IntervalContext,
): [number, number] | null => {
  const channel = axis === 'primary' ? mark.encoding.x : mark.encoding.y;
  const role = axis === 'primary' ? 'x' : 'y';
  const bandCtx = ctx.byRole[role];
  switch (bound.kind) {
    case IntervalBoundKind.Band: {
      const center = scale.coordinate(channelValue(channel, row));
      if (!Number.isFinite(center)) return null;
      if (bandCtx?.group !== undefined) {
        const index = subBandIndexOf(bandCtx, row);
        const start = center - bandCtx.bandwidth / 2 + index * bandCtx.subWidth;
        return [start, start + bandCtx.subWidth];
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
        throw new Error(
          `lowerPlots: interval extent bound requires numeric ${bound.from} / ${bound.to} fields (run the stack / bin / derive-interval transform first)`,
        );
      }
      const lo = scale.coordinate(rawLo);
      const hi = scale.coordinate(rawHi);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      return [lo, hi];
    }
    case IntervalBoundKind.Proportional: {
      const raw = ctx.proportionalByRole?.[role]?.get(row);
      if (raw === undefined) {
        throw new Error(`lowerPlots: interval proportional bound requires context for role ${role}`);
      }
      const lo = scale.coordinate(raw[0]);
      const hi = scale.coordinate(raw[1]);
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
 *   polar 下 primary（角度）或 secondary（半径）跨度退化（< DEFAULT_EPSILON）→ null（与旧 sector / radial bar 守卫一致）。
 */
export const intervalCell = (
  mark: IRPlotIntervalMark,
  row: ExternalRow,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  ctx: IntervalContext,
): Cell | null => {
  const primary = boundOutputInterval(resolveIntervalBound(mark, 'x'), 'primary', frame.primary, mark, row, frame, ctx);
  if (primary === null) return null;
  const secondary = boundOutputInterval(
    resolveIntervalBound(mark, 'y'),
    'secondary',
    frame.secondary,
    mark,
    row,
    frame,
    ctx,
  );
  if (secondary === null) return null;
  if (frame.type === PlotCoordinate.Polar2D) {
    if (Math.abs(primary[1] - primary[0]) < DEFAULT_EPSILON) return null;
    if (Math.abs(secondary[1] - secondary[0]) < DEFAULT_EPSILON) return null;
  }
  return { intervals: { x: primary, y: secondary } };
};

/**
 * 读取 ternary interval 的 x/y/z 分量并归一化。
 * @description 三元坐标要求三项齐全、非负且和大于 0；缺通道或非法数值 fail-loud / 跳过，
 *   这样后续 bound 计算只面对 0..1 的稳定 barycentric 分量。
 */
const normalizedTernaryComponents = (
  mark: IRPlotIntervalMark,
  row: ExternalRow,
): Record<'x' | 'y' | 'z', number> | null => {
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
    throw new Error(
      `lowerPlots: ternary interval components overflow when summed (got x=${x}, y=${y}, z=${z}); use proportions or smaller magnitudes`,
    );
  }
  return { x: x / sum, y: y / sum, z: z / sum };
};

/**
 * ternary interval 的单 role bound → 归一化分量区间。
 * @description ternary 没有 band 宽度语义，因此拒绝 band；span 从 baseline 到当前归一化分量；
 *   extent 直接读取用户字段，full 覆盖 0..1。非数值 extent fail-loud，避免生成不可解释的三元区域。
 */
const ternaryBoundOutputInterval = (
  bound: IRPlotIntervalBound,
  role: 'x' | 'y' | 'z',
  mark: IRPlotIntervalMark,
  row: ExternalRow,
  components: Record<'x' | 'y' | 'z', number>,
): [number, number] | null => {
  switch (bound.kind) {
    case IntervalBoundKind.Band:
      throw new Error(
        `lowerPlots: ternary interval does not support band bounds on ${role}; use span, extent, or full`,
      );
    case IntervalBoundKind.Span:
      return [bound.baseline ?? 0, components[role]];
    case IntervalBoundKind.Extent: {
      const lo = resolveFieldPath(row, bound.from);
      const hi = resolveFieldPath(row, bound.to);
      if (!isFiniteNumber(lo) || !isFiniteNumber(hi)) {
        throw new Error(
          `lowerPlots: ternary interval extent bound requires numeric ${bound.from} / ${bound.to} fields`,
        );
      }
      return [lo, hi];
    }
    case IntervalBoundKind.Proportional:
      throw new Error(
        `lowerPlots: ternary interval does not support proportional bounds on ${role}; use span, extent, or full`,
      );
    case IntervalBoundKind.Full:
      return [0, 1];
  }
};

/**
 * 通用坐标帧的 interval bound → role 输出空间区间。
 * @description 自定义 frame 若要支持 interval，必须同时提供 projectCell 与 roleScales；
 *   mark 侧只负责把 encoding/bounds 解析成正交 cell，最终几何仍交给 frame.projectCell。
 */
const genericBoundOutputInterval = (
  bound: IRPlotIntervalBound,
  role: DimensionRole,
  mark: IRPlotIntervalMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
): [number, number] | null => {
  const scale = frame.roleScales?.[role];
  if (!scale) {
    throw new Error(
      `lowerPlots: interval mark under the ${frame.type} coordinate system requires roleScales.${role} to build cells`,
    );
  }
  const channel = channelForRole(mark, role);
  switch (bound.kind) {
    case IntervalBoundKind.Band: {
      const center = scale.coordinate(channelValue(channel, row));
      if (!Number.isFinite(center)) return null;
      if (bound.group !== undefined) {
        if (ctx === undefined) {
          throw new Error(
            `lowerPlots: interval mark under the ${frame.type} coordinate system requires grouped band context for bounds.${role}.group`,
          );
        }
        const bandCtx = ctx.byRole[role];
        if (bandCtx === undefined) {
          throw new Error(
            `lowerPlots: interval mark under the ${frame.type} coordinate system requires grouped band context for bounds.${role}.group`,
          );
        }
        const index = subBandIndexOf(bandCtx, row);
        const start = center - bandCtx.bandwidth / 2 + index * bandCtx.subWidth;
        return [start, start + bandCtx.subWidth];
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
    case IntervalBoundKind.Proportional: {
      const raw = ctx?.proportionalByRole?.[role]?.get(row);
      if (raw === undefined) {
        throw new Error(
          `lowerPlots: interval proportional bound under the ${frame.type} coordinate system requires proportional context for bounds.${role}`,
        );
      }
      const lo = scale.coordinate(raw[0]);
      const hi = scale.coordinate(raw[1]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      return [lo, hi];
    }
    case IntervalBoundKind.Full:
      return scale.range();
  }
};

/** 带 projectCell 的通用坐标帧：按 frame.roles 和各 role scale 构造正交 cell。 */
const genericIntervalCell = (
  mark: IRPlotIntervalMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
): Cell | null => {
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
export const ternaryIntervalCell = (mark: IRPlotIntervalMark, row: ExternalRow): Cell | null => {
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
export const markCell = (
  mark: IRPlotMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
): Cell | null => {
  if (mark.type !== PlotMark.Interval) return null;
  if (isTernary2DCoordinateFrame(frame)) return ternaryIntervalCell(mark, row);
  if (isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame))
    return ctx ? intervalCell(mark, row, frame, ctx) : null;
  if (isGenericCoordinateFrame(frame) && hasProjectCell(frame)) return genericIntervalCell(mark, row, frame, ctx);
  return null;
};

/** interval cell 类 mark 某行的 series 值（写进 datum meta；series 字段拆分）。 */
const cellSeriesValue = (mark: IRPlotMark, row: ExternalRow): unknown =>
  mark.type === PlotMark.Interval && mark.series !== undefined ? resolveFieldPath(row, mark.series) : undefined;

const resolveSectorPull = (mark: IRPlotIntervalMark, row: ExternalRow): number => {
  const pull = mark.pull;
  if (pull === undefined) return 0;
  const value = pull.kind === 'field' ? resolveFieldPath(row, pull.value) : pull.value;
  if (!isFiniteNumber(value) || value < 0) {
    throw new Error('lowerPlots: interval pull requires a finite non-negative numeric value for polar sector geometry');
  }
  return value;
};

/** 把 interval 的视觉参数应用到已投影 cell 图元。 */
export const applyIntervalCellVisualParams = (
  geometry: CellGeometry,
  mark: IRPlotIntervalMark,
  row: ExternalRow,
): CellGeometry => {
  if (geometry.kind !== 'sector') {
    if (mark.pull !== undefined) {
      throw new Error('lowerPlots: interval pull is only supported for polar sector geometry');
    }
    return geometry;
  }
  const startAngle = geometry.startAngle;
  const endAngle = geometry.endAngle;
  const padAngle = mark.padAngle;
  let nextStartAngle = startAngle;
  let nextEndAngle = endAngle;
  if (padAngle !== undefined) {
    const sweep = endAngle - startAngle;
    const maxInset = Math.max(0, Math.abs(sweep) - 1e-6);
    const inset = Math.min(padAngle, maxInset);
    if (inset > 0) {
      const direction = sweep >= 0 ? 1 : -1;
      nextStartAngle = startAngle + (direction * inset) / 2;
      nextEndAngle = endAngle - (direction * inset) / 2;
    }
  }
  const pull = resolveSectorPull(mark, row);
  return {
    ...geometry,
    center: pull > 0 ? arcEndPoint(geometry.center, pull, (nextStartAngle + nextEndAngle) / 2) : geometry.center,
    startAngle: nextStartAngle,
    endAngle: nextEndAngle,
  };
};

/** 解析单行 interval 在当前坐标帧中的 cell 几何。 */
export const intervalCellGeometry = (
  mark: IRPlotIntervalMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx: IntervalContext | undefined,
): CellGeometry | null => {
  if (!hasProjectCell(frame)) return null;
  const cell = markCell(mark, row, frame, ctx);
  if (!cell) return null;
  return applyIntervalCellVisualParams(frame.projectCell(cell), mark, row);
};

const moveSectorCornerRadiusToShapeParams = (node: IRNode): void => {
  const cornerRadius = node.cornerRadius;
  const shape = node.shape;
  if (cornerRadius === undefined || typeof shape !== 'object' || shape.type !== 'sector') return;
  node.shape = {
    ...shape,
    params: {
      ...(shape.params ?? {}),
      cornerRadius,
    },
  };
  delete node.cornerRadius;
};

/**
 * interval 单路径下沉：算 cell → frame.projectCell → CellGeometry → 装配 Node（坐标系无关）。
 * @description 判断挪进坐标系（frame.projectCell 产 rect / sector / contour），mark 侧零分叉。装配样式按 geometry
 *   kind 选（rect → 矩形 barStyle、sector / contour → shapeStyle）。无可绘制图元返回 null。
 */
const lowerCells = (
  mark: IRPlotIntervalMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  intervalContext: IntervalContext | undefined,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  channels: MarkChannels,
  markContext: MarkLoweringContext | undefined,
  labelOf: ChannelValueResolver<IRNodeLabel['text']> | undefined,
): IRScope | null => {
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  const fillOf =
    'fill' in mark && mark.fill?.kind === 'field' && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf =
    'stroke' in mark && mark.stroke?.kind === 'field' ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  let kind: CellGeometry['kind'] | undefined;
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const geometry = intervalCellGeometry(mark, row, frame, intervalContext);
    if (!geometry) continue;
    if (!isRenderableCellGeometry(geometry)) continue;
    kind = geometry.kind;
    const cellNode = cellGeometryNode(geometry);
    if (cellNode === null) continue;
    const fill = fillOf?.(row);
    if (fill !== undefined) cellNode.fill = fill;
    const stroke = strokeOf?.(row);
    if (stroke !== undefined) cellNode.stroke = stroke;
    applyNodeChannelDeliveries(cellNode, mark, row, channels, 'cell');
    moveSectorCornerRadiusToShapeParams(cellNode);
    const node = attachDatumLabel(
      attachDatumAnchor(
        decorateDatum(cellNode, row, transformedIndex, mark.type, markContext?.provenance, cellSeriesValue(mark, row)),
        mark,
        row,
        transformedIndex,
        markContext,
      ),
      mark,
      row,
      labelOf,
    );
    placed.push({ color: colorOf?.(row), node });
  }
  const defaultFill = channelDefaultOf<MarkPaint>(channels, 'fill') ?? defaultColor ?? undefined;
  const defaultStroke = channelDefaultOf<MarkPaint>(channels, 'stroke');
  return placed.length === 0 || kind === undefined
    ? null
    : cellLayer(placed, kind, mark, colorOf, defaultFill, defaultStroke);
};

/** interval mark 图层下沉：坐标系守卫 + IntervalContext + lowerCells（cell 类单路径）。 */
export const lowerIntervalLayer = (
  mark: IRPlotMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  if (mark.type !== PlotMark.Interval) return null;
  // interval 需要坐标帧提供 cell 几何投影；内置和自定义帧都走同一 projectCell 契约。
  if (!hasProjectCell(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const intervalContext = buildIntervalContext(mark, frame, rows);
  const layer = lowerCells(
    mark,
    rows,
    frame,
    intervalContext,
    channelValueOf<string>(channels, 'color'),
    channelDefaultOf<string>(channels, 'color'),
    channels,
    ctx,
    channelValueOf<IRNodeLabel['text']>(channels, 'label'),
  );
  return layer === null ? null : attachMarkLayer(layer, mark, ctx?.provenance);
};

/** 收集 interval mark 独有字段：series 分组与显式 extent bounds。 */
const collectIntervalChannelFields = (mark: IRPlotIntervalMark, fields: FieldCollector): void => {
  fields.addField(mark.series);
  if (mark.pull?.kind === 'field') fields.addField(mark.pull.value);
  if (mark.bounds !== undefined) {
    for (const bound of Object.values(mark.bounds)) {
      if (bound.kind === 'extent') fields.addFields(bound.from, bound.to);
      if (bound.kind === 'proportional') fields.addField(bound.field);
    }
  }
};

/** 内置 interval mark definition。 */
export const intervalMarkDefinition: MarkDefinition<IRPlotIntervalMark> = {
  schema: IntervalMarkSchema,
  channelKinds: nodeChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectIntervalChannelFields(mark, fields);
  },
  buildCell: (mark, row, frame, ctx) => markCell(mark, row, frame, ctx),
  lower: lowerIntervalLayer,
};
