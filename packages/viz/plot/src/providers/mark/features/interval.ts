import type { IRChild, IRNode, IRNodeLabel, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { inferCategoryDomain, resolveFieldPath } from '@retikz/data';
import { DEFAULT_EPSILON, isFiniteNumber } from '@retikz/math';

import type {
  Cell,
  CellGeometry,
  ChannelValueResolver,
  CoordinateFrame,
  DimensionRole,
  FieldCollector,
  IntervalContext,
  MarkChannels,
  MarkInstanceInput,
  MarkLoweringContext,
  PositionScale,
} from '../../../contract';
import type { PolarCoordinateFrame } from '../../../contract';
import {
  hasProjectCell,
  isRenderableCellGeometry,
  channelField,
  markInstances,
  mapPositionInput,
  positionField,
} from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotPositionInput, IRPlotIntervalBound, IRPlotIntervalMark, IRPlotMark } from '../../../schemas';
import { IntervalBoundKind, IntervalMarkSchema, BuiltinPlotCoordinate, BuiltinPlotMark } from '../../../schemas';
import type { CartesianCoordinateFrame } from '../../coordinate';
import { isCartesianCoordinateFrame, isGenericCoordinateFrame, isPolarCoordinateFrame } from '../../coordinate';
import { cellGeometryNode, cellLayer } from '../private';
import type { MarkPaint } from '../shared';
import { mappedRoleValue } from '../shared';
import {
  applyNodeChannelDeliveries,
  attachMarkAnchor,
  attachDatumLabel,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectCommonEncodingFields,
  collectNodeChannelFields,
  decorateDatum,
  failLoudMessage,
  nodeChannelKinds,
  resolveNodeMarkLabels,
} from '../shared';
import type { MarkDefinition } from '../types';

type IntervalRoleContext = NonNullable<IntervalContext['byRole'][string]>;

/**
 * 解析某 interval mark 在某位置 role 的有效区间来源（缺省推断）
 * @description 显式 bounds 优先；省略时按惯例推断——primary（x）band、secondary（y）span(baseline 0)。
 *   lowering 与 scale 推断共用此单一真源，杜绝两处各推各的漂移
 */
export const resolveIntervalBound = (mark: IRPlotIntervalMark, role: DimensionRole): IRPlotIntervalBound => {
  const explicit = (mark.properties?.bounds as Record<string, IRPlotIntervalBound | undefined> | undefined)?.[role];
  if (explicit !== undefined) return explicit;
  return role === 'x' ? { kind: IntervalBoundKind.Band } : { kind: IntervalBoundKind.Span };
};

/** 读取权重字段，空间端点使用位置输入 */
export const intervalBoundField = (mark: IRPlotIntervalMark, role: string, target: 'weight'): string => {
  const field = mark.encodings?.bounds?.[role as 'x' | 'y']?.[target];
  if (field === undefined) throw new RetikzPlotError('Interval bound requires weight for role ' + role);
  return field;
};

/** 读取显式端点的字段、常量或边缘来源 */
export const intervalBoundInput = (
  mark: IRPlotIntervalMark,
  role: string,
  endpoint: 'from' | 'to',
): IRPlotPositionInput => {
  const input = mark.encodings?.bounds?.[role as 'x' | 'y']?.[endpoint];
  if (input === undefined) throw new RetikzPlotError('Interval bound requires ' + endpoint + ' for role ' + role);
  return input;
};

/**
 * 建某 band role 的摆放上下文（每 mark 每 role 一次；lowering 与 locator 同源）
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
    throw new RetikzPlotError(`lowerPlots: interval proportional bound requires a non-negative numeric ${field} field`);
  }

  return value;
};

/** 按数据权重构造每行对应的比例累计区间 */
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
      throw new RetikzPlotError(
        `lowerPlots: interval proportional bound overflows while accumulating ${field}; use smaller magnitudes`,
      );
    }

    intervals.set(row, [cursor, next]);
    cursor = next;
  }

  return intervals;
};

/** 收集比例区间需要贡献给位置比例尺的域值 */
export const proportionalIntervalDomainValues = (field: string, rows: Array<ExternalRow>): Array<number> => {
  const values: Array<number> = [0];
  let cursor = 0;

  for (const row of rows) {
    const width = assertProportionalWidth(field, resolveFieldPath(row, field));
    if (width === null) continue;

    const next = cursor + width;
    if (!Number.isFinite(next)) {
      throw new RetikzPlotError(
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
    if (bound.kind === IntervalBoundKind.Proportional)
      byRole[role] = buildProportionalIntervals(intervalBoundField(mark, role, 'weight'), rows);
  }

  return Object.values(byRole)[0] === undefined ? undefined : byRole;
};

/**
 * 建某 interval mark 的摆放上下文（每 mark 一次；lowering 与 locator 同源）
 * @description 内置 cartesian / polar frame 有固定 x/y role，因此总能建立 role band 上下文；
 *   generic frame 只在 `bounds.<role>=band{group}` 时需要上下文，其余 interval 直接由 roleScales 构造 cell
 */
export const buildIntervalContext = (
  mark: IRPlotIntervalMark,
  frame: CoordinateFrame,
  rows: Array<ExternalRow>,
): IntervalContext | undefined => {
  if (isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame)) {
    const bounds: Partial<NonNullable<NonNullable<IRPlotIntervalMark['encodings']>['bounds']>> | undefined =
      mark.encodings?.bounds;
    const xBound = resolveIntervalBound(mark, 'x');
    const yBound = resolveIntervalBound(mark, 'y');
    const xContext = buildBandContext(
      frame.primary.bandwidth,
      xBound.kind === IntervalBoundKind.Band ? bounds?.x?.group : undefined,
      rows,
    );
    const yContext = buildBandContext(
      frame.secondary.bandwidth,
      yBound.kind === IntervalBoundKind.Band ? bounds?.y?.group : undefined,
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
      const group =
        bound.kind === IntervalBoundKind.Band ? mark.encodings?.bounds?.[role as 'x' | 'y']?.group : undefined;
      if (group === undefined) continue;

      const scale = frame.roleScales?.[role];
      if (!scale) {
        throw new RetikzPlotError(
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

/** 取某行的 group 子带序号（值不在 rank 表 / 非标量 → 0，与 lowering 兜底一致） */
const subBandIndexOf = (ctx: IntervalRoleContext, row: ExternalRow | undefined): number => {
  if (ctx.group === undefined) return 0;
  const series = resolveFieldPath(row!, ctx.group);
  return (typeof series === 'string' || typeof series === 'number' ? ctx.seriesRank.get(series) : undefined) ?? 0;
};

/**
 * 把某 role 的 IntervalBound 解析成 scale 输出空间区间 [lo,hi]（cartesian=像素、polar=角度度 / 半径 user units）
 * @description band：中心取位置通道、宽取 bandwidth（group 切子带，仅 primary）；span：baseline→值；
 *   extent：两字段（非有限 → fail-loud，保旧堆叠 / 扇形缺字段行为）；full：满铺该 role 坐标域。非有限 → null（跳过该行）
 */
const boundOutputInterval = (
  bound: IRPlotIntervalBound,
  axis: 'primary' | 'secondary',
  scale: PositionScale,
  mark: IRPlotIntervalMark,
  row: ExternalRow | undefined,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  ctx: IntervalContext,
): [number, number] | null => {
  const role = axis === 'primary' ? 'x' : 'y';
  const bandCtx = ctx.byRole[role];

  switch (bound.kind) {
    case IntervalBoundKind.Band: {
      const center = mappedRoleValue(mark, role, row, scale);
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
      const value = mappedRoleValue(mark, role, row, scale);
      if (!Number.isFinite(base) || !Number.isFinite(value)) return null;

      return [base, value];
    }
    case IntervalBoundKind.Extent: {
      const lo = mapPositionInput(intervalBoundInput(mark, role, 'from'), scale, row);
      const hi = mapPositionInput(intervalBoundInput(mark, role, 'to'), scale, row);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;

      return [lo, hi];
    }
    case IntervalBoundKind.Proportional: {
      const raw = ctx.proportionalByRole?.[role]?.get(row!);
      if (raw === undefined) {
        throw new RetikzPlotError(`lowerPlots: interval proportional bound requires context for role ${role}`);
      }

      const lo = scale.coordinate(raw[0]);
      const hi = scale.coordinate(raw[1]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;

      return [lo, hi];
    }
    case IntervalBoundKind.Full: {
      if (axis === 'secondary' && frame.type === BuiltinPlotCoordinate.Polar2D)
        return [frame.innerRadius, frame.outerRadius];
      return scale.range();
    }
  }
};

/**
 * interval mark 某行 → 正交 cell（lowering 摆放与 locator 锚点的共享单一真源；坐标系无关）
 * @description primary = bounds.x、secondary = bounds.y 各经 boundOutputInterval 解析。任一非有限 → null（跳过该行）；
 *   polar 下 primary（角度）或 secondary（半径）跨度退化（< DEFAULT_EPSILON）→ null（与旧 sector / radial bar 守卫一致）
 */
export const intervalCell = (
  mark: IRPlotIntervalMark,
  row: ExternalRow | undefined,
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
  if (frame.type === BuiltinPlotCoordinate.Polar2D) {
    if (Math.abs(primary[1] - primary[0]) < DEFAULT_EPSILON) return null;
    if (Math.abs(secondary[1] - secondary[0]) < DEFAULT_EPSILON) return null;
  }

  return { intervals: { x: primary, y: secondary } };
};

/**
 * 通用坐标帧的 interval bound → role 输出空间区间
 * @description 自定义 frame 若要支持 interval，必须同时提供 projectCell 与 roleScales；
 *   mark 侧只负责把 encoding/bounds 解析成正交 cell，最终几何仍交给 frame.projectCell
 */
const genericBoundOutputInterval = (
  bound: IRPlotIntervalBound,
  role: DimensionRole,
  mark: IRPlotIntervalMark,
  row: ExternalRow | undefined,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
): [number, number] | null => {
  const scale = frame.roleScales?.[role];
  if (!scale) {
    throw new RetikzPlotError(
      `lowerPlots: interval mark under the ${frame.type} coordinate system requires roleScales.${role} to build cells`,
    );
  }

  switch (bound.kind) {
    case IntervalBoundKind.Band: {
      const center = mappedRoleValue(mark, role, row, scale);
      if (!Number.isFinite(center)) return null;
      if (mark.encodings?.bounds?.[role as 'x' | 'y']?.group !== undefined) {
        if (ctx === undefined) {
          throw new RetikzPlotError(
            `lowerPlots: interval mark under the ${frame.type} coordinate system requires grouped band context for bounds.${role}.group`,
          );
        }

        const bandCtx = ctx.byRole[role];
        if (bandCtx === undefined) {
          throw new RetikzPlotError(
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
      const value = mappedRoleValue(mark, role, row, scale);
      if (!Number.isFinite(base) || !Number.isFinite(value)) return null;

      return [base, value];
    }
    case IntervalBoundKind.Extent: {
      const lo = mapPositionInput(intervalBoundInput(mark, role, 'from'), scale, row);
      const hi = mapPositionInput(intervalBoundInput(mark, role, 'to'), scale, row);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;

      return [lo, hi];
    }
    case IntervalBoundKind.Proportional: {
      const raw = ctx?.proportionalByRole?.[role]?.get(row!);
      if (raw === undefined) {
        throw new RetikzPlotError(
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

/** 带 projectCell 的通用坐标帧：按 frame.roles 和各 role scale 构造正交 cell */
const genericIntervalCell = (
  mark: IRPlotIntervalMark,
  row: ExternalRow | undefined,
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
 * 某 mark 的某行 → cell（坐标系相关）；非 interval mark / 退化行 → null
 * @description interval → intervalCell（cartesian / polar）或通用 coordinate cell；其余 mark → null（非 cell 类）。
 *   interval 在无对应正交 cell 的坐标系（1D / 无 projectCell 的 custom）返回 null，由 mark.ts fail-loud
 */
export const markCell = (
  mark: IRPlotMark,
  row: ExternalRow | undefined,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
): Cell | null => {
  if (mark.type !== BuiltinPlotMark.Interval) return null;
  if (isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame))
    return ctx ? intervalCell(mark, row, frame, ctx) : null;
  if (isGenericCoordinateFrame(frame) && hasProjectCell(frame)) return genericIntervalCell(mark, row, frame, ctx);

  return null;
};

/** interval cell 类 mark 某行的 series 值（写进 datum meta；series 字段拆分） */
const cellSeriesValue = (mark: IRPlotMark, row: ExternalRow | undefined): unknown =>
  mark.type === BuiltinPlotMark.Interval && mark.encodings?.series !== undefined
    ? resolveFieldPath(row!, mark.encodings.series)
    : undefined;

const resolvePolarCellPull = (mark: IRPlotIntervalMark, row: ExternalRow | undefined): number => {
  const binding = mark.encodings?.pull;
  const value = binding === undefined ? (mark.properties?.pull ?? 0) : resolveFieldPath(row!, channelField(binding));
  if (!isFiniteNumber(value) || value < 0) {
    throw new RetikzPlotError(
      'lowerPlots: interval pull requires a finite non-negative numeric value for polar cell geometry',
    );
  }

  return value;
};

/** 把 padAngle 应用到 cell 的角向输出区间，不修改原 cell */
const paddedPolarCell = (cell: Cell, mark: IRPlotIntervalMark): Cell => {
  const interval = cell.intervals.x;
  if (interval === undefined) return cell;

  const [startAngle, endAngle] = interval;
  const padAngle = mark.properties?.padAngle;
  if (padAngle === undefined) return cell;

  const sweep = endAngle - startAngle;
  const maxInset = Math.max(0, Math.abs(sweep) - 1e-6);
  const inset = Math.min(padAngle, maxInset);
  if (inset <= 0) return cell;

  const direction = sweep >= 0 ? 1 : -1;

  return {
    intervals: {
      ...cell.intervals,
      x: [startAngle + (direction * inset) / 2, endAngle - (direction * inset) / 2],
    },
  };
};

/** 解析单行 interval 在当前坐标帧中的 cell 几何 */
export const intervalCellGeometry = (
  mark: IRPlotIntervalMark,
  row: ExternalRow | undefined,
  frame: CoordinateFrame,
  ctx: IntervalContext | undefined,
  pull?: number,
): CellGeometry | null => {
  if (!hasProjectCell(frame)) return null;

  const cell = markCell(mark, row, frame, ctx);
  if (!cell) return null;
  if (isPolarCoordinateFrame(frame)) {
    return frame.projectCell(paddedPolarCell(cell, mark), {
      connection: mark.properties?.connection,
      interpolation: mark.properties?.interpolation ?? frame.interpolation,
      pull: pull ?? resolvePolarCellPull(mark, row),
    });
  }

  if (mark.properties?.interpolation !== undefined) {
    throw new RetikzPlotError('lowerPlots: interval interpolation override is only supported under polar2D');
  }

  if (mark.encodings?.pull !== undefined || mark.properties?.pull !== undefined) {
    throw new RetikzPlotError('lowerPlots: interval pull is only supported for polar2D cell geometry');
  }

  return frame.projectCell(cell, { connection: mark.properties?.connection });
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
 * interval 单路径下沉：算 cell → frame.projectCell → CellGeometry → 装配 Node（坐标系无关）
 * @description 判断挪进坐标系（frame.projectCell 产 rect / sector / contour），mark 侧零分叉。装配样式按 geometry
 *   kind 选（rect → 矩形 barStyle、sector / contour → shapeStyle）。无可绘制图元返回 null
 */
const lowerCells = (
  mark: IRPlotIntervalMark,
  instances: MarkInstanceInput,
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
    mark.encodings?.fill !== undefined && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = mark.encodings?.stroke !== undefined ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  let kind: CellGeometry['kind'] | undefined;

  for (const instance of markInstances(instances)) {
    const row = instance.kind === 'row' ? instance.row : undefined;
    const transformedIndex = instance.kind === 'row' ? instance.transformedIndex : undefined;
    const geometry = intervalCellGeometry(
      mark,
      row,
      frame,
      intervalContext,
      row === undefined ? undefined : channelValueOf<number>(channels, 'pull')?.(row),
    );
    if (!geometry) continue;
    if (!isRenderableCellGeometry(geometry)) continue;

    kind = geometry.kind;
    const cellNode = cellGeometryNode(geometry);
    if (cellNode === null) continue;

    const fill = row === undefined ? undefined : fillOf?.(row);
    if (fill !== undefined) cellNode.style = { ...cellNode.style, fill };
    const stroke = row === undefined ? undefined : strokeOf?.(row);
    if (stroke !== undefined) cellNode.style = { ...cellNode.style, stroke };
    if (row !== undefined) applyNodeChannelDeliveries(cellNode, mark, row, channels, 'cell');
    moveSectorCornerRadiusToShapeParams(cellNode);
    const fixedLabels =
      row === undefined ? resolveNodeMarkLabels(mark.properties?.label, undefined, undefined) : undefined;
    const node =
      row === undefined || transformedIndex === undefined
        ? attachMarkAnchor(
            { ...cellNode, ...(fixedLabels === undefined ? {} : { label: fixedLabels }) },
            mark,
            instance,
            markContext,
          )
        : attachDatumLabel(
            attachMarkAnchor(
              decorateDatum(
                cellNode,
                row,
                transformedIndex,
                mark.type,
                markContext?.provenance,
                cellSeriesValue(mark, row),
              ),
              mark,
              instance,
              markContext,
            ),
            mark,
            row,
            labelOf,
            channels,
          );
    placed.push({ color: row === undefined ? undefined : colorOf?.(row), node });
  }

  const defaultFill = channelDefaultOf<MarkPaint>(channels, 'fill') ?? defaultColor ?? undefined;
  const defaultStroke = channelDefaultOf<MarkPaint>(channels, 'stroke');

  return placed.length === 0 || kind === undefined
    ? null
    : cellLayer(placed, kind, mark, colorOf, defaultFill, defaultStroke);
};

/** interval mark 图层下沉：坐标系守卫 + IntervalContext + lowerCells（cell 类单路径） */
export const lowerIntervalLayer = (
  mark: IRPlotMark,
  instances: MarkInstanceInput,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  if (mark.type !== BuiltinPlotMark.Interval) return null;

  // interval 需要坐标帧提供 cell 几何投影；内置和自定义帧都走同一 projectCell 契约。
  if (!hasProjectCell(frame)) {
    throw new RetikzPlotError(failLoudMessage(mark.type, frame.type));
  }

  const intervalContext = buildIntervalContext(mark, frame, instances.kind === 'rows' ? instances.rows : []);
  const layer = lowerCells(
    mark,
    instances,
    frame,
    intervalContext,
    channelValueOf<string>(channels, 'color'),
    channelDefaultOf<string>(channels, 'color'),
    channels,
    ctx,
    channelValueOf<IRNodeLabel['text']>(channels, 'label'),
  );

  return layer === null ? null : attachMarkLayer(layer, mark, ctx);
};

/** 收集 interval mark 独有字段：series 分组与显式 extent bounds */
const collectIntervalChannelFields = (mark: IRPlotIntervalMark, fields: FieldCollector): void => {
  fields.addField(mark.encodings?.series);
  fields.addChannel(mark.encodings?.pull);
  for (const bound of Object.values(mark.encodings?.bounds ?? {}))
    fields.addFields(bound.group, positionField(bound.from), positionField(bound.to), bound.weight);
};

/** 内置 interval mark definition */
export const intervalMarkDefinition: MarkDefinition<IRPlotIntervalMark> = {
  schema: IntervalMarkSchema,
  labelHost: 'node',
  channelKinds: nodeChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectIntervalChannelFields(mark, fields);
  },
  buildCell: (mark, instance, frame, ctx) =>
    markCell(mark, instance.kind === 'row' ? instance.row : undefined, frame, ctx),
  lower: lowerIntervalLayer,
};
