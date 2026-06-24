import { type IRChild, type IRNode, type IRScope, type IRStep } from '@retikz/core';
import {
  type Cell,
  type CellGeometry,
  type ChannelValueResolver,
  type CoordinateFrame,
  type FieldCollector,
  type MarkChannels,
  type MarkDefinition,
  type MarkProvenance,
  isRenderableCellGeometry,
} from '../../contract';
import { channelValue, resolveFieldPath } from '../data';
import {
  type CartesianCoordinateFrame,
  type PolarCoordinateFrame,
  densifyPolarSegments,
  isCartesianCoordinateFrame,
  isPolarCoordinateFrame,
} from '../coordinate';
import { type ExternalRow, type Mark, PlotMark, type ReferenceMark } from '../../schemas';
import { cellGeometryNode, cellLayer, styleForGeometry } from './cell';
import { pointsToSteps } from './path';
import {
  DEFAULT_FILL,
  LINE_STROKE_WIDTH,
  type MarkPaint,
  applyNodeChannelDeliveries,
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectNodeChannelFields,
  collectPathChannelFields,
  decorateDatum,
  failLoudMessage,
} from './shared';
import { ChannelDefinitionKind } from '../../contract';

/** reference 描边宽度（参考线；与 path mark 同宽，视觉一致）。 */
const REFERENCE_STROKE_WIDTH = LINE_STROKE_WIDTH;

/**
 * reference 取向：恰好绑 encoding.x（竖直）或 encoding.y（水平）之一；皆设 / 皆缺 → fail-loud。
 */
const referenceOrientation = (mark: ReferenceMark): 'x' | 'y' => {
  const hasX = mark.encoding.x !== undefined;
  const hasY = mark.encoding.y !== undefined;
  if (hasX === hasY) {
    throw new Error('lowerPlots: reference mark must bind exactly one of encoding.x (vertical) or encoding.y (horizontal); set one, not both / neither');
  }
  return hasX ? 'x' : 'y';
};

/**
 * reference 的对侧维（垂直于常量轴）输出区间：默认满铺该轴 range，extent 字段给定时截成 [extentLo, extentTo] 输出坐标。
 */
const referenceSpanInterval = (mark: ReferenceMark, row: ExternalRow, oppositeCoordinate: (value: unknown) => number, oppositeRange: [number, number]): [number, number] | null => {
  const hasFrom = mark.extentField !== undefined;
  const hasTo = mark.extentToField !== undefined;
  if (hasFrom !== hasTo) {
    throw new Error('lowerPlots: reference mark extentField / extentToField must be set together (a partial-length span needs both start and end)');
  }
  if (!hasFrom) return oppositeRange;
  const lo = oppositeCoordinate(resolveFieldPath(row, mark.extentField as string));
  const hi = oppositeCoordinate(resolveFieldPath(row, mark.extentToField as string));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
};

/** reference line 某行的常量轴值（绑 x → encoding.x、绑 y → encoding.y；value 常量 / field per-datum 均经 channelValue）。 */
const referenceConstantValue = (mark: ReferenceMark, row: ExternalRow, orientation: 'x' | 'y'): unknown =>
  channelValue(orientation === 'x' ? mark.encoding.x : mark.encoding.y, row);

/** reference band 某行的上界值（绑 x → xTo、绑 y → yTo；number 常量 / string field per-datum）。 */
const referenceUpperValue = (mark: ReferenceMark, row: ExternalRow, orientation: 'x' | 'y'): unknown => {
  const bound = orientation === 'x' ? mark.xTo : mark.yTo;
  return typeof bound === 'string' ? resolveFieldPath(row, bound) : bound;
};

/** reference 是否 band 形态（绑定维度上给了匹配的上界 xTo / yTo）；并校验上界与所绑维度匹配（不匹配 / 单飞 → fail-loud）。 */
const isReferenceBand = (mark: ReferenceMark, orientation: 'x' | 'y'): boolean => {
  if (orientation === 'x' && mark.yTo !== undefined) {
    throw new Error('lowerPlots: reference mark binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)');
  }
  if (orientation === 'y' && mark.xTo !== undefined) {
    throw new Error('lowerPlots: reference mark binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)');
  }
  return (orientation === 'x' ? mark.xTo : mark.yTo) !== undefined;
};

/**
 * reference 是否完全常量（单条 full-span line / band，不逐行）：常量轴是 value、band 上界是 number、无 extent field。
 */
const isReferenceConstant = (mark: ReferenceMark, orientation: 'x' | 'y'): boolean => {
  const constantChannel = orientation === 'x' ? mark.encoding.x : mark.encoding.y;
  if (constantChannel?.field !== undefined) return false;
  const upper = orientation === 'x' ? mark.xTo : mark.yTo;
  if (typeof upper === 'string') return false;
  return mark.extentField === undefined && mark.extentToField === undefined;
};

/** reference 的有效迭代行：全常量 → 单行代表（任取首行，无行则空对象）；per-datum → 原数据行。 */
const referenceRows = (mark: ReferenceMark, rows: Array<ExternalRow>, orientation: 'x' | 'y'): Array<ExternalRow> =>
  isReferenceConstant(mark, orientation) ? [rows[0] ?? {}] : rows;

/** reference line 某行 → core Path steps（cartesian 直连两端点；polar 竖直径向线直连、水平常半径环段采样）；退化 → null。 */
const referenceLineSteps = (mark: ReferenceMark, row: ExternalRow, frame: CartesianCoordinateFrame | PolarCoordinateFrame, orientation: 'x' | 'y'): Array<IRStep> | null => {
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
  if (!Number.isFinite(radius)) return null;
  const angleSpan = referenceSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
  if (angleSpan === null) return null;
  const points = densifyPolarSegments(frame, [
    { theta: angleSpan[0], radius },
    { theta: angleSpan[1], radius },
  ]);
  return pointsToSteps(points, false);
};

/** reference band 某行 → 正交 Cell（cartesian primary/secondary 为像素带、polar primary 为角度带 / secondary 为半径带）；退化 → null。 */
const referenceBandCell = (mark: ReferenceMark, row: ExternalRow, frame: CartesianCoordinateFrame | PolarCoordinateFrame, orientation: 'x' | 'y'): Cell | null => {
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
  const radiusSpan = referenceSpanInterval(mark, row, frame.secondary.coordinate, [frame.innerRadius, frame.outerRadius]);
  if (radiusSpan === null) return null;
  return { intervals: { x: [a0, a1], y: radiusSpan } };
};

/**
 * 参考标注（reference mark）下沉：line → core Path（每行一条）、band → projectCell Node（每行一个）。
 */
const lowerReference = (
  mark: ReferenceMark,
  rows: Array<ExternalRow>,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  channels: MarkChannels,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  const orientation = referenceOrientation(mark);
  if (isReferenceConstant(mark, orientation) && mark.encoding.color?.field !== undefined) {
    throw new Error(
      `lowerPlots: a constant reference (single full-span line) cannot use a per-datum color field "${mark.encoding.color.field}"; use a constant color value, or bind a per-datum position field`,
    );
  }
  const band = isReferenceBand(mark, orientation);
  const effectiveRows = referenceRows(mark, rows, orientation);
  const defaultFill = channelDefaultOf<MarkPaint>(channels, 'fill') ?? defaultColor ?? DEFAULT_FILL;
  const defaultStroke = channelDefaultOf<MarkPaint>(channels, 'stroke') ?? defaultColor ?? DEFAULT_FILL;
  const fillOf = mark.fill?.kind === 'field' && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = mark.stroke?.kind === 'field' ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;

  if (band) {
    const placed: Array<{ color: string | undefined; node: IRNode }> = [];
    let kind: CellGeometry['kind'] | undefined;
    for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
      const row = effectiveRows[transformedIndex];
      const cell = referenceBandCell(mark, row, frame, orientation);
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
      applyNodeChannelDeliveries(cellNode, mark, row, channels, 'cell');
      const node = decorateDatum(cellNode, row, transformedIndex, mark.type, markProvenance, undefined);
      placed.push({ color: colorOf?.(row), node });
    }
    if (placed.length === 0 || kind === undefined) return null;
    if (!colorOf) {
      const colorValue = mark.encoding.color?.value;
      const fill = colorValue !== undefined ? String(colorValue) : defaultFill;
      return { type: 'scope', nodeDefault: styleForGeometry(kind, mark)(fill, channelDefaultOf<MarkPaint>(channels, 'stroke')), children: placed.map(p => p.node) };
    }
    return cellLayer(placed, kind, mark, colorOf, undefined, channelDefaultOf<MarkPaint>(channels, 'stroke'));
  }

  const placed: Array<{ color: string | undefined; steps: Array<IRStep>; row: ExternalRow; transformedIndex: number }> = [];
  for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
    const row = effectiveRows[transformedIndex];
    const steps = referenceLineSteps(mark, row, frame, orientation);
    if (!steps) continue;
    placed.push({ color: colorOf?.(row), steps, row, transformedIndex });
  }
  if (placed.length === 0) return null;
  if (!colorOf) {
    const colorValue = mark.encoding.color?.value;
    const stroke = colorValue !== undefined ? String(colorValue) : defaultStroke;
    return { type: 'scope', pathDefault: { stroke, strokeWidth: REFERENCE_STROKE_WIDTH }, children: placed.map(p => applyPathChannelDeliveries({ type: 'path', children: p.steps }, mark, p.row, channels)) };
  }
  const groups = new Map<string, Array<IRChild>>();
  for (const { color, row, steps } of placed) {
    const stroke = color ?? DEFAULT_FILL;
    const directStroke = strokeOf?.(row);
    const path: IRChild = applyPathChannelDeliveries({ type: 'path', ...(directStroke !== undefined ? { stroke: directStroke } : {}), children: steps }, mark, row, channels);
    const bucket = groups.get(stroke);
    if (bucket) bucket.push(path);
    else groups.set(stroke, [path]);
  }
  const children: Array<IRChild> = [...groups].map(([stroke, paths]) => ({ type: 'scope', pathDefault: { stroke }, children: paths }));
  return { type: 'scope', pathDefault: { strokeWidth: REFERENCE_STROKE_WIDTH }, children };
};

/** reference 图层下沉：line 走 core Path、band 走 projectCell；本轮仅 cartesian2D / polar2D，其余坐标系 fail-loud + attachMarkLayer。 */
export const lowerReferenceLayer = (
  mark: Mark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  markProvenance: MarkProvenance | undefined,
): IRChild | null => {
  if (mark.type !== PlotMark.Reference) return null;
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerReference(mark, rows, frame, channels, channelValueOf<string>(channels, 'color'), channelDefaultOf<string>(channels, 'color'), markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** 收集 reference mark 的位置 / color / 扩展 encoding 字段。 */
const collectReferenceEncodingFields = (mark: ReferenceMark, fields: FieldCollector): void => {
  fields.addChannel(mark.encoding.x);
  fields.addChannel(mark.encoding.y);
  fields.addChannel(mark.encoding.z);
  fields.addChannel(mark.encoding.color);
  for (const channel of Object.values(mark.encoding.channels ?? {})) {
    fields.addChannel(channel);
  }
};

/** 收集 reference mark 独有字段：band 上界与部分 span 范围。 */
const collectReferenceChannelFields = (mark: ReferenceMark, fields: FieldCollector): void => {
  fields.addFields(typeof mark.xTo === 'string' ? mark.xTo : undefined, typeof mark.yTo === 'string' ? mark.yTo : undefined, mark.extentField, mark.extentToField);
};

export const referenceMarkDefinition: MarkDefinition<ReferenceMark> = {
  type: PlotMark.Reference,
  channelKinds: () => new Set([ChannelDefinitionKind.Mark, ChannelDefinitionKind.Scope, ChannelDefinitionKind.Node, ChannelDefinitionKind.Path]),
  collectFields: (mark, fields: FieldCollector) => {
    collectReferenceEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectPathChannelFields(mark, fields);
    collectReferenceChannelFields(mark, fields);
  },
  lower: lowerReferenceLayer,
};
