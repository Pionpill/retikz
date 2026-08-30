import type { ExternalRow } from '@retikz/data';

import { type IRChild, type IRNode, type IRNodeLabel, type IRPath, type IRScope, type IRStep } from '@retikz/core';
import { resolveFieldPath } from '@retikz/data';

import type {
  Cell,
  CellGeometry,
  ChannelValueResolver,
  CoordinateFrame,
  FieldCollector,
  MarkChannels,
  MarkDefinition,
  MarkLoweringContext,
  MarkProvenance,
  PositionScale,
} from '../../../contract';
import type { PolarCoordinateFrame } from '../../../contract';
import type { IRPlotMark, IRPlotMarkGeometryLabel, IRPlotMarkNodeLabel, IRPlotReferenceMark } from '../../../schemas';
import type { CartesianCoordinateFrame } from '../../coordinate';
import type { MarkPaint } from '../shared';

import { hasProjectCell, isRenderableCellGeometry } from '../../../contract';
import { ChannelDefinitionKind } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import { PlotMark, ReferenceMarkKind, ReferenceMarkSchema } from '../../../schemas';
import { channelValue } from '../../channel/shared';
import { isCartesianCoordinateFrame, isPolarCoordinateFrame } from '../../coordinate';
import { cellGeometryNode, cellLayer, styleForGeometry } from '../private';
import {
  applyNodeChannelDeliveries,
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectMarkLabelFields,
  collectNodeChannelFields,
  collectPathChannelFields,
  decorateDatum,
  DEFAULT_FILL,
  failLoudMessage,
  LINE_STROKE_WIDTH,
  resolveGeometryMarkLabels,
  resolveNodeMarkLabels,
} from '../shared';
import { pointsToSteps } from './path';

/** reference 描边宽度（参考线；与 path mark 同宽，视觉一致） */
const REFERENCE_STROKE_WIDTH = LINE_STROKE_WIDTH;

const referencePathOptions = (mark: IRPlotReferenceMark): Partial<Pick<IRPath, 'marks'>> =>
  mark.marks === undefined ? {} : { marks: mark.marks };

type ReferenceOrientation = 'x' | 'y';

type ReferenceShape =
  | { kind: 'axis'; orientation: ReferenceOrientation; band: boolean }
  | { kind: typeof ReferenceMarkKind.Region };

const isReferenceRegion = (mark: IRPlotReferenceMark): boolean => mark.kind === ReferenceMarkKind.Region;

/**
 * reference 取向：恰好绑 encoding.x（竖直）或 encoding.y（水平）之一；皆设 / 皆缺 → fail-loud
 */
const referenceOrientation = (mark: IRPlotReferenceMark): ReferenceOrientation => {
  const hasX = mark.encoding.x !== undefined;
  const hasY = mark.encoding.y !== undefined;
  if (hasX === hasY) {
    throw new RetikzPlotError(
      'lowerPlots: reference mark must bind exactly one of encoding.x (vertical) or encoding.y (horizontal); set one, not both / neither',
    );
  }
  return hasX ? 'x' : 'y';
};

/**
 * reference 的对侧维（垂直于常量轴）输出区间：默认满铺该轴 range，extent 字段给定时截成 [extentLo, extentTo] 输出坐标
 */
const referenceSpanInterval = (
  mark: IRPlotReferenceMark,
  row: ExternalRow,
  oppositeCoordinate: (value: unknown) => number,
  oppositeRange: [number, number],
): [number, number] | null => {
  const hasFrom = mark.extentField !== undefined;
  const hasTo = mark.extentToField !== undefined;
  if (hasFrom !== hasTo) {
    throw new RetikzPlotError(
      'lowerPlots: reference mark extentField / extentToField must be set together (a partial-length span needs both start and end)',
    );
  }
  if (!hasFrom) return oppositeRange;
  const lo = oppositeCoordinate(resolveFieldPath(row, mark.extentField as string));
  const hi = oppositeCoordinate(resolveFieldPath(row, mark.extentToField as string));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
};

/** reference line 某行的常量轴值（绑 x → encoding.x、绑 y → encoding.y；value 常量 / field per-datum 均经 channelValue） */
const referenceConstantValue = (
  mark: IRPlotReferenceMark,
  row: ExternalRow,
  orientation: ReferenceOrientation,
): unknown => channelValue(orientation === 'x' ? mark.encoding.x : mark.encoding.y, row);

const isFullPolarSweep = (startAngle: number, endAngle: number): boolean => Math.abs(endAngle - startAngle) >= 360;

/** reference band 某行的上界值（绑 x → xTo、绑 y → yTo；number 常量 / string field per-datum） */
const referenceUpperValue = (
  mark: IRPlotReferenceMark,
  row: ExternalRow,
  orientation: ReferenceOrientation,
): unknown => {
  const bound = orientation === 'x' ? mark.xTo : mark.yTo;
  return typeof bound === 'string' ? resolveFieldPath(row, bound) : bound;
};

/** reference 是否 band 形态（绑定维度上给了匹配的上界 xTo / yTo）；并校验上界与所绑维度匹配（不匹配 / 单飞 → fail-loud） */
const isReferenceBand = (mark: IRPlotReferenceMark, orientation: ReferenceOrientation): boolean => {
  if (orientation === 'x' && mark.yTo !== undefined) {
    throw new RetikzPlotError(
      'lowerPlots: reference mark binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)',
    );
  }
  if (orientation === 'y' && mark.xTo !== undefined) {
    throw new RetikzPlotError(
      'lowerPlots: reference mark binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)',
    );
  }
  return (orientation === 'x' ? mark.xTo : mark.yTo) !== undefined;
};

const referenceShape = (mark: IRPlotReferenceMark): ReferenceShape => {
  if (!isReferenceRegion(mark)) {
    const orientation = referenceOrientation(mark);
    return { kind: 'axis', orientation, band: isReferenceBand(mark, orientation) };
  }
  if (mark.extentField !== undefined || mark.extentToField !== undefined) {
    throw new RetikzPlotError(
      'lowerPlots: reference region does not support extentField / extentToField; set x/xTo/y/yTo bounds directly',
    );
  }
  return { kind: ReferenceMarkKind.Region };
};

const referenceRegionUpperRaw = (mark: IRPlotReferenceMark, role: string): number | string | undefined => {
  if (role === 'x') return mark.xTo;
  if (role === 'y') return mark.yTo;
  return undefined;
};

const referenceRegionRequireRole = (mark: IRPlotReferenceMark, role: string, frame: CoordinateFrame): void => {
  if (!Object.prototype.hasOwnProperty.call(mark.encoding, role) || referenceRegionUpperRaw(mark, role) === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: reference region under the ${frame.type} coordinate system requires encoding.${role} and ${role}To bounds`,
    );
  }
};

const referenceRegionCoordinate = (
  value: unknown,
  role: string,
  scale: PositionScale | undefined,
  frame: CoordinateFrame,
): number => {
  if (scale === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: reference region under the ${frame.type} coordinate system requires roleScales.${role} to build cells`,
    );
  }
  return scale.coordinate(value);
};

const referenceRegionScale = (role: string, frame: CoordinateFrame): PositionScale | undefined => {
  if (isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame)) {
    if (role === 'x') return frame.primary;
    if (role === 'y') return frame.secondary;
  }
  return frame.roleScales?.[role];
};

/**
 * reference 是否完全常量（单条 full-span line / band / region，不逐行）：边界均为 value/number、无 extent field。
 */
const isReferenceConstant = (mark: IRPlotReferenceMark, shape: ReferenceShape, frame: CoordinateFrame): boolean => {
  if (shape.kind === ReferenceMarkKind.Region) {
    for (const role of frame.roles) {
      referenceRegionRequireRole(mark, role, frame);
      if (mark.encoding[role].field !== undefined) return false;
      if (typeof referenceRegionUpperRaw(mark, role) === 'string') return false;
    }
    return true;
  }
  const { orientation } = shape;
  const constantChannel = orientation === 'x' ? mark.encoding.x : mark.encoding.y;
  if (constantChannel?.field !== undefined) return false;
  const upper = orientation === 'x' ? mark.xTo : mark.yTo;
  if (typeof upper === 'string') return false;
  return mark.extentField === undefined && mark.extentToField === undefined;
};

/** reference 的有效迭代行：全常量 → 单行代表（任取首行，无行则空对象）；per-datum → 原数据行。 */
const referenceRows = (
  mark: IRPlotReferenceMark,
  rows: Array<ExternalRow>,
  shape: ReferenceShape,
  frame: CoordinateFrame,
): Array<ExternalRow> => (isReferenceConstant(mark, shape, frame) ? [rows[0] ?? {}] : rows);

/** reference line 某行 → core Path steps（cartesian 直连两端点；polar 竖直径向线直连、水平常半径环段采样）；退化 → null。 */
const referenceLineSteps = (
  mark: IRPlotReferenceMark,
  row: ExternalRow,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  orientation: ReferenceOrientation,
): Array<IRStep> | null => {
  const constantValue = referenceConstantValue(mark, row, orientation);
  if (isCartesianCoordinateFrame(frame)) {
    const constant = frame[orientation === 'x' ? 'primary' : 'secondary'].coordinate(constantValue);
    if (!Number.isFinite(constant)) return null;
    const opposite = orientation === 'x' ? frame.secondary : frame.primary;
    const span = referenceSpanInterval(mark, row, opposite.coordinate, opposite.range());
    if (span === null) return null;
    const start: [number, number] = orientation === 'x' ? [constant, span[0]] : [span[0], constant];
    const end: [number, number] = orientation === 'x' ? [constant, span[1]] : [span[1], constant];
    return pointsToSteps([start, end], false);
  }
  if (orientation === 'x') {
    const theta = frame.primary.coordinate(constantValue);
    if (!Number.isFinite(theta)) return null;
    const span = referenceSpanInterval(mark, row, frame.secondary.coordinate, [frame.innerRadius, frame.outerRadius]);
    if (span === null) return null;
    const inner = frame.projectPolar(theta, span[0]);
    const outer = frame.projectPolar(theta, span[1]);
    return inner && outer ? pointsToSteps([inner, outer], false) : null;
  }
  const radius = frame.secondary.coordinate(constantValue);
  if (!Number.isFinite(radius) || radius <= 0) return null;
  const angleSpan = referenceSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
  if (angleSpan === null) return null;
  const centerStep: IRStep = { type: 'step', kind: 'move', to: frame.center };
  const ringStep: IRStep = isFullPolarSweep(angleSpan[0], angleSpan[1])
    ? { type: 'step', kind: 'circlePath', radius }
    : { type: 'step', kind: 'circlePath', radius, startAngle: angleSpan[0], endAngle: angleSpan[1], closed: 'open' };
  return [centerStep, ringStep];
};

/** reference band 某行 → 正交 Cell（cartesian primary/secondary 为像素带、polar primary 为角度带 / secondary 为半径带）；退化 → null。 */
const referenceAxisBandCell = (
  mark: IRPlotReferenceMark,
  row: ExternalRow,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  orientation: ReferenceOrientation,
): Cell | null => {
  const lo = referenceConstantValue(mark, row, orientation);
  const hi = referenceUpperValue(mark, row, orientation);
  if (isCartesianCoordinateFrame(frame)) {
    const constScale = orientation === 'x' ? frame.primary : frame.secondary;
    const c0 = constScale.coordinate(lo);
    const c1 = constScale.coordinate(hi);
    if (!Number.isFinite(c0) || !Number.isFinite(c1)) return null;
    const opposite = orientation === 'x' ? frame.secondary : frame.primary;
    const span = referenceSpanInterval(mark, row, opposite.coordinate, opposite.range());
    if (span === null) return null;
    return { intervals: orientation === 'x' ? { x: [c0, c1], y: span } : { x: span, y: [c0, c1] } };
  }
  if (orientation === 'y') {
    const r0 = frame.secondary.coordinate(lo);
    const r1 = frame.secondary.coordinate(hi);
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) return null;
    const angleSpan = referenceSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
    if (angleSpan === null) return null;
    return { intervals: { x: angleSpan, y: [r0, r1] } };
  }
  const a0 = frame.primary.coordinate(lo);
  const a1 = frame.primary.coordinate(hi);
  if (!Number.isFinite(a0) || !Number.isFinite(a1)) return null;
  const radiusSpan = referenceSpanInterval(mark, row, frame.secondary.coordinate, [
    frame.innerRadius,
    frame.outerRadius,
  ]);
  if (radiusSpan === null) return null;
  return { intervals: { x: [a0, a1], y: radiusSpan } };
};

const referenceRegionCell = (mark: IRPlotReferenceMark, row: ExternalRow, frame: CoordinateFrame): Cell | null => {
  const intervals: Cell['intervals'] = {};
  for (const role of frame.roles) {
    referenceRegionRequireRole(mark, role, frame);
    const lowerChannel = mark.encoding[role];
    const upperRaw = referenceRegionUpperRaw(mark, role);
    const lowerValue = channelValue(lowerChannel, row);
    const upperValue = typeof upperRaw === 'string' ? resolveFieldPath(row, upperRaw) : upperRaw;
    const scale = referenceRegionScale(role, frame);
    const lower = referenceRegionCoordinate(lowerValue, role, scale, frame);
    const upper = referenceRegionCoordinate(upperValue, role, scale, frame);
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;
    intervals[role] = [lower, upper];
  }
  return { intervals };
};

/** reference cell 形态（axis band / region）某行 → 正交 Cell；line 形态返回 null。 */
export const referenceCell = (mark: IRPlotReferenceMark, row: ExternalRow, frame: CoordinateFrame): Cell | null => {
  const shape = referenceShape(mark);
  if (shape.kind === ReferenceMarkKind.Region) return referenceRegionCell(mark, row, frame);
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) return null;
  return shape.band ? referenceAxisBandCell(mark, row, frame, shape.orientation) : null;
};

/**
 * 参考标注（reference mark）下沉：line → core Path（每行一条）、band / region → projectCell Node（每行一个）。
 */
const lowerReference = (
  mark: IRPlotReferenceMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  const shape = referenceShape(mark);
  if (isReferenceConstant(mark, shape, frame) && mark.encoding.color?.field !== undefined) {
    throw new RetikzPlotError(
      `lowerPlots: a constant reference cannot use a per-datum color field "${mark.encoding.color.field}"; use a constant color value, or bind a per-datum position field`,
    );
  }
  const cellForm = shape.kind === ReferenceMarkKind.Region || shape.band;
  const effectiveRows = referenceRows(mark, rows, shape, frame);
  const defaultFill = channelDefaultOf<MarkPaint>(channels, 'fill') ?? defaultColor ?? DEFAULT_FILL;
  const defaultStroke = channelDefaultOf<MarkPaint>(channels, 'stroke') ?? defaultColor ?? DEFAULT_FILL;
  const fillOf = mark.fill?.kind === 'field' && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = mark.stroke?.kind === 'field' ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  const labelOf = channelValueOf<IRNodeLabel['text']>(channels, 'label');

  if (cellForm) {
    if (!hasProjectCell(frame)) {
      throw new RetikzPlotError(failLoudMessage(mark.type, frame.type));
    }
    const placed: Array<{ color: string | undefined; node: IRNode }> = [];
    let kind: CellGeometry['kind'] | undefined;
    for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
      const row = effectiveRows[transformedIndex];
      const cell =
        shape.kind === ReferenceMarkKind.Region
          ? referenceRegionCell(mark, row, frame)
          : isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame)
            ? referenceAxisBandCell(mark, row, frame, shape.orientation)
            : null;
      if (!cell) continue;
      const geometry = frame.projectCell(cell);
      if (!isRenderableCellGeometry(geometry)) continue;
      kind = geometry.kind;
      const cellNode = cellGeometryNode(geometry);
      if (cellNode === null) continue;
      const fill = fillOf?.(row);
      if (fill !== undefined) cellNode.fill = fill;
      const stroke = strokeOf?.(row);
      if (stroke !== undefined) cellNode.stroke = stroke;
      const label = resolveNodeMarkLabels(
        mark.label as IRPlotMarkNodeLabel | ReadonlyArray<IRPlotMarkNodeLabel> | undefined,
        row,
        labelOf,
      );
      if (label !== undefined) cellNode.label = label;
      applyNodeChannelDeliveries(cellNode, mark, row, channels, 'cell');
      const node = decorateDatum(cellNode, row, transformedIndex, mark.type, markProvenance, undefined);
      placed.push({ color: colorOf?.(row), node });
    }
    if (placed.length === 0 || kind === undefined) return null;
    if (!colorOf) {
      const colorValue = mark.encoding.color?.value;
      const fill = colorValue !== undefined ? String(colorValue) : defaultFill;
      return {
        type: 'scope',
        nodeDefault: styleForGeometry(kind, mark)(fill, channelDefaultOf<MarkPaint>(channels, 'stroke')),
        children: placed.map(p => p.node),
      };
    }
    return cellLayer(placed, kind, mark, colorOf, undefined, channelDefaultOf<MarkPaint>(channels, 'stroke'));
  }

  const placed: Array<{ color: string | undefined; steps: Array<IRStep>; row: ExternalRow; transformedIndex: number }> =
    [];
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new RetikzPlotError(failLoudMessage(mark.type, frame.type));
  }
  for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
    const row = effectiveRows[transformedIndex];
    const steps = referenceLineSteps(mark, row, frame, shape.orientation);
    if (!steps) continue;
    placed.push({ color: colorOf?.(row), steps, row, transformedIndex });
  }
  if (placed.length === 0) return null;
  if (!colorOf) {
    const colorValue = mark.encoding.color?.value;
    const stroke = colorValue !== undefined ? String(colorValue) : defaultStroke;
    return {
      type: 'scope',
      pathDefault: { stroke, strokeWidth: REFERENCE_STROKE_WIDTH },
      children: placed.map(p => {
        const label = resolveGeometryMarkLabels(
          mark.label as IRPlotMarkGeometryLabel | ReadonlyArray<IRPlotMarkGeometryLabel> | undefined,
          p.row,
          labelOf,
        );
        return applyPathChannelDeliveries(
          { type: 'path', ...referencePathOptions(mark), ...(label !== undefined ? { label } : {}), children: p.steps },
          mark,
          p.row,
          channels,
        );
      }),
    };
  }
  const groups = new Map<string, Array<IRChild>>();
  for (const { color, row, steps } of placed) {
    const stroke = color ?? DEFAULT_FILL;
    const directStroke = strokeOf?.(row);
    const label = resolveGeometryMarkLabels(
      mark.label as IRPlotMarkGeometryLabel | ReadonlyArray<IRPlotMarkGeometryLabel> | undefined,
      row,
      labelOf,
    );
    const path: IRChild = applyPathChannelDeliveries(
      {
        type: 'path',
        ...referencePathOptions(mark),
        ...(directStroke !== undefined ? { stroke: directStroke } : {}),
        ...(label !== undefined ? { label } : {}),
        children: steps,
      },
      mark,
      row,
      channels,
    );
    const bucket = groups.get(stroke);
    if (bucket) bucket.push(path);
    else groups.set(stroke, [path]);
  }
  const children: Array<IRChild> = [...groups].map(([stroke, paths]) => ({
    type: 'scope',
    pathDefault: { stroke },
    children: paths,
  }));
  return { type: 'scope', pathDefault: { strokeWidth: REFERENCE_STROKE_WIDTH }, children };
};

/** reference 图层下沉：line 走 core Path、band 走 projectCell；本轮仅 cartesian2D / polar2D，其余坐标系 fail-loud + attachMarkLayer。 */
export const lowerReferenceLayer = (
  mark: IRPlotMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  if (mark.type !== PlotMark.Reference) return null;
  const shape = referenceShape(mark);
  if (shape.kind === ReferenceMarkKind.Region) {
    if (!hasProjectCell(frame)) {
      throw new RetikzPlotError(failLoudMessage(mark.type, frame.type));
    }
  } else if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new RetikzPlotError(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerReference(
    mark,
    rows,
    frame,
    channels,
    channelValueOf<string>(channels, 'color'),
    channelDefaultOf<string>(channels, 'color'),
    ctx?.provenance,
  );
  return layer === null ? null : attachMarkLayer(layer, mark, ctx);
};

/** 收集 reference mark 的位置 / color / 扩展 encoding 字段。 */
const collectReferenceEncodingFields = (mark: IRPlotReferenceMark, fields: FieldCollector): void => {
  fields.addChannel(mark.encoding.x);
  fields.addChannel(mark.encoding.y);
  fields.addChannel(mark.encoding.color);
  for (const channel of Object.values(mark.encoding.channels ?? {})) {
    fields.addChannel(channel);
  }
};

/** 收集 reference mark 独有字段：band 上界与部分 span 范围。 */
const collectReferenceChannelFields = (mark: IRPlotReferenceMark, fields: FieldCollector): void => {
  fields.addFields(
    typeof mark.xTo === 'string' ? mark.xTo : undefined,
    typeof mark.yTo === 'string' ? mark.yTo : undefined,
    mark.extentField,
    mark.extentToField,
  );
};

/** 内置 reference mark definition。 */
export const referenceMarkDefinition: MarkDefinition<IRPlotReferenceMark> = {
  schema: ReferenceMarkSchema,
  channelKinds: () =>
    new Set([
      ChannelDefinitionKind.Mark,
      ChannelDefinitionKind.Scope,
      ChannelDefinitionKind.Node,
      ChannelDefinitionKind.Path,
    ]),
  collectFields: (mark, fields: FieldCollector) => {
    collectReferenceEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectPathChannelFields(mark, fields);
    collectReferenceChannelFields(mark, fields);
    collectMarkLabelFields(mark.label, fields);
  },
  buildCell: (mark, row, frame) =>
    isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame) || hasProjectCell(frame)
      ? referenceCell(mark, row, frame)
      : null,
  lower: lowerReferenceLayer,
};
