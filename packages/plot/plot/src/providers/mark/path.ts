import { type IRChild, type IRPath, type IRScope, type IRStep } from '@retikz/core';
import { type ChannelValueResolver, type CoordinateFrame, type FieldCollector, type MarkChannels, type MarkDefinition, type MarkProvenance } from '../../contract';
import { channelValue, compareRowsByFieldPath, inferCategoryDomain, resolveFieldPath } from '../data';
import {
  type PolarVertex,
  densifyPolarSegments,
  isCartesianCoordinateFrame,
  isPolarCoordinateFrame,
  toPolarVertex,
} from '../coordinate';
import { type ExternalRow, type Mark, type PathMark, PlotMark, type RegionMark } from '../../schemas';
import {
  DEFAULT_FILL,
  LINE_STROKE_WIDTH,
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectCommonEncodingFields,
  collectPathChannelFields,
  failLoudMessage,
  pathChannelKinds,
} from './shared';
import { seriesPathMeta, slug } from '../../pipeline';

/** region mark 的默认 baseline（回边贴的值；cartesian = y 基线、polar = 径向内界方向）。 */
const AREA_BASELINE = 0;

/**
 * 取一行的位置通道值 → [xValue, yValue]（坐标系无关；投影交给 frame.project，frame 把 x/y 重解释为对应角色）。
 * @description x/y 是唯一位置通道（坐标系决定其含义）。
 */
const resolveRolePosition = (mark: Mark, row: ExternalRow): [unknown, unknown] =>
  mark.type === PlotMark.Link ? [undefined, undefined] : [channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)];

/** 把若干屏幕点连成 move + line steps（按需尾部加 cycle 闭合）；点数 < 2 返回 null。 */
export const pointsToSteps = (points: ReadonlyArray<[number, number]>, closed: boolean): Array<IRStep> | null => {
  if (points.length < 2) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  if (closed) steps.push({ type: 'step', kind: 'cycle' });
  return steps;
};

/** 按 order / 数据序排好一组行（path / region 共用连接顺序）。 */
const orderRows = (rows: Array<ExternalRow>, order: string | undefined): Array<ExternalRow> =>
  order ? [...rows].sort((a, b) => compareRowsByFieldPath(a, b, order)) : rows;

/**
 * 把一组有序行投影成上沿屏幕点（坐标系无关）。
 * @description cartesian / polar 分类角轴 / closed 走弦（顶点直连）；polar 连续角轴段内采样弯弧。
 */
const buildOutlinePoints = (mark: Mark, ordered: Array<ExternalRow>, frame: CoordinateFrame, closed: boolean): Array<[number, number]> => {
  if (isPolarCoordinateFrame(frame) && frame.continuousAngle && !closed) {
    const vertices = ordered
      .map(row => {
        const [primaryValue, secondaryValue] = resolveRolePosition(mark, row);
        return toPolarVertex(frame, primaryValue, secondaryValue);
      })
      .filter((vertex): vertex is PolarVertex => vertex !== null);
    return densifyPolarSegments(frame, vertices);
  }
  return ordered
    .map(row => {
      const [primaryValue, secondaryValue] = resolveRolePosition(mark, row);
      return frame.project(primaryValue, secondaryValue);
    })
    .filter((point): point is [number, number] => point !== null);
};

/** 把一组行连成一条折线的 steps（上沿投影 + 可选闭合）；<2 点返回 null。 */
const buildLineSteps = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, closed: boolean): Array<IRStep> | null =>
  pointsToSteps(buildOutlinePoints(mark, orderRows(rows, mark.type === PlotMark.Path || mark.type === PlotMark.Region ? mark.order : undefined), frame, closed), closed);

/** 多系列 series 拆分通用：每条 series 一条 Path，provenance 开时绑 `<plotId>.series.<slug>` + Path.meta（series 原值）。 */
type SeriesPathBuilder = (seriesRows: Array<ExternalRow>) => Array<IRStep> | null;

/** path child 的可变形态（series 下沉时按需补 id / meta），直接复用 core IRPath 属性面。 */
type IRPathChild = IRPath;

const buildSeriesPaths = (
  mark: Mark,
  rows: Array<ExternalRow>,
  seriesField: string,
  buildSteps: SeriesPathBuilder,
  paintOf: (seriesRows: Array<ExternalRow>) => Record<string, string>,
  channels: MarkChannels,
  markProvenance: MarkProvenance | undefined,
): Array<IRChild> => {
  const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
  const plotId = markProvenance?.context.plotId;
  const seenIds = markProvenance && plotId !== undefined ? new Map<string, unknown>() : undefined;
  const paths: Array<IRChild> = [];
  for (const series of seriesValues) {
    const seriesRows = rows.filter(row => resolveFieldPath(row, seriesField) === series);
    const steps = buildSteps(seriesRows);
    if (!steps) continue;
    const path: IRPathChild = applyPathChannelDeliveries({ type: 'path', ...paintOf(seriesRows), children: steps }, mark, seriesRows[0] ?? {}, channels);
    if (markProvenance) {
      if (plotId !== undefined && seenIds) {
        const id = `${plotId}.series.${slug(series)}`;
        const prior = seenIds.get(id);
        if (prior !== undefined && prior !== series) {
          throw new Error(`lowerPlots: series values "${String(prior)}" and "${String(series)}" collide to the same series id "${id}"; series anchors must be unique`);
        }
        seenIds.set(id, series);
        path.id = id;
      }
      path.meta = seriesPathMeta(mark.type, markProvenance.markIndex, series);
    }
    paths.push(path);
  }
  return paths;
};

/**
 * 显式 series + color 字段并存时，校验 color 在每个 series 组内恒定（否则 fail-loud）。
 */
const assertColorConstantWithinSeries = (rows: Array<ExternalRow>, seriesField: string, colorField: string): void => {
  const colorsBySeries = new Map<unknown, Set<unknown>>();
  for (const row of rows) {
    const seriesValue = resolveFieldPath(row, seriesField);
    const colorValue = resolveFieldPath(row, colorField);
    const set = colorsBySeries.get(seriesValue) ?? new Set<unknown>();
    set.add(colorValue);
    colorsBySeries.set(seriesValue, set);
  }
  for (const [seriesValue, colors] of colorsBySeries) {
    if (colors.size > 1) {
      throw new Error(
        `lowerPlots: color field "${colorField}" is not constant within series "${String(seriesValue)}"; color must be constant per series, or split by color instead of setting series`,
      );
    }
  }
};

/**
 * path mark（path / region）的有效 series 字段。
 * @description 显式 mark.series 优先；无显式 series 但有 categorical color 字段 → 隐式按 color 拆系列。
 *   显式 series 与 color 字段并存且 color 在 series 内不恒定 → fail-loud。
 */
const pathSeriesField = (mark: Mark, rows: Array<ExternalRow>): string | undefined => {
  if (mark.type !== PlotMark.Path && mark.type !== PlotMark.Region) return undefined;
  const colorField = mark.encoding.color?.field;
  if (mark.series) {
    if (colorField && colorField !== mark.series) assertColorConstantWithinSeries(rows, mark.series, colorField);
    return mark.series;
  }
  return colorField;
};

/** 折线（path mark）：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（坐标系无关）。 */
const lowerPath = (
  mark: Mark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  if (mark.type !== PlotMark.Path) return null;
  const closed = mark.closed ?? false;
  const seriesField = pathSeriesField(mark, rows);
  if (seriesField) {
    const paths = buildSeriesPaths(
      mark,
      rows,
      seriesField,
      seriesRows => buildLineSteps(mark, seriesRows, frame, closed),
      seriesRows => ({ stroke: colorOf?.(seriesRows[0]) ?? DEFAULT_FILL }),
      channels,
      markProvenance,
    );
    return paths.length === 0 ? null : { type: 'scope', pathDefault: { strokeWidth: LINE_STROKE_WIDTH }, children: paths };
  }
  const steps = buildLineSteps(mark, rows, frame, closed);
  if (!steps) return null;
  const colorValue = mark.encoding.color?.value;
  const stroke = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
  return { type: 'scope', pathDefault: { stroke, strokeWidth: LINE_STROKE_WIDTH }, children: [applyPathChannelDeliveries({ type: 'path', children: steps }, mark, rows[0] ?? {}, channels)] };
};

/**
 * 把一组有序行投影成 baseline 回边屏幕点（沿同 primary 序，secondary 固定为 baseline，逆序）。
 */
const buildBaselinePoints = (mark: Mark, ordered: Array<ExternalRow>, frame: CoordinateFrame, baseline: number): Array<[number, number]> => {
  const points: Array<[number, number]> = [];
  for (const row of ordered) {
    const [primaryValue] = resolveRolePosition(mark, row);
    const point = frame.project(primaryValue, baseline);
    if (point) points.push(point);
  }
  return points.reverse();
};

/** 把一个 region 的上沿 + baseline 回边连成可填充 Path 的 steps；上沿 < 2 点返回 null。 */
const buildAreaSteps = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, baseline: number): Array<IRStep> | null => {
  const ordered = orderRows(rows, mark.type === PlotMark.Region ? mark.order : undefined);
  const closed = mark.type === PlotMark.Region ? (mark.closed ?? false) : false;
  const top = buildOutlinePoints(mark, ordered, frame, closed);
  if (top.length < 2) return null;
  const bottom = buildBaselinePoints(mark, ordered, frame, baseline);
  const outline = [...top, ...bottom];
  return [
    { type: 'step', kind: 'move', to: outline[0] },
    ...outline.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
    { type: 'step', kind: 'cycle' },
  ];
};

/** 区域（region mark）：上沿折线 + baseline 回边闭合的可填充 Path（坐标系无关）；单系列或多系列。 */
const lowerRegion = (
  mark: Mark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  if (mark.type !== PlotMark.Region) return null;
  const baseline = mark.baseline ?? AREA_BASELINE;
  const seriesField = pathSeriesField(mark, rows);
  if (seriesField) {
    const paths = buildSeriesPaths(
      mark,
      rows,
      seriesField,
      seriesRows => buildAreaSteps(mark, seriesRows, frame, baseline),
      seriesRows => ({ fill: colorOf?.(seriesRows[0]) ?? DEFAULT_FILL }),
      channels,
      markProvenance,
    );
    return paths.length === 0 ? null : { type: 'scope', children: paths };
  }
  const steps = buildAreaSteps(mark, rows, frame, baseline);
  if (!steps) return null;
  const colorValue = mark.encoding.color?.value;
  const fill = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
  return { type: 'scope', pathDefault: { fill }, children: [applyPathChannelDeliveries({ type: 'path', children: steps }, mark, rows[0] ?? {}, channels)] };
};

/** path 图层下沉：仅 cartesian2D / polar2D 有上沿几何；其余坐标系 fail-loud + attachMarkLayer。 */
export const lowerPathLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerPath(mark, rows, frame, channels, channelValueOf<string>(channels, 'color'), channelDefaultOf<string>(channels, 'color'), markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** region 图层下沉：仅 cartesian2D / polar2D 有上沿 / 回边几何；其余坐标系 fail-loud + attachMarkLayer。 */
export const lowerRegionLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerRegion(mark, rows, frame, channels, channelValueOf<string>(channels, 'color'), channelDefaultOf<string>(channels, 'color'), markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** 收集 path mark 独有字段：连接顺序与 series 拆分。 */
const collectPathMarkChannelFields = (mark: PathMark, fields: FieldCollector): void => {
  fields.addFields(mark.order, mark.series);
};

/** 收集 region mark 独有字段：上沿连接顺序与 series 拆分。 */
const collectRegionMarkChannelFields = (mark: RegionMark, fields: FieldCollector): void => {
  fields.addFields(mark.order, mark.series);
};

export const pathMarkDefinition: MarkDefinition<PathMark> = {
  type: PlotMark.Path,
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectPathChannelFields(mark, fields);
    collectPathMarkChannelFields(mark, fields);
  },
  lower: lowerPathLayer,
};

export const regionMarkDefinition: MarkDefinition<RegionMark> = {
  type: PlotMark.Region,
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectPathChannelFields(mark, fields);
    collectRegionMarkChannelFields(mark, fields);
  },
  lower: lowerRegionLayer,
};
