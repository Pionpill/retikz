import { type IRChild, type IRScope, type IRStep } from '@retikz/core';
import { isFiniteNumber } from '@retikz/math';
import { type CoordinateFrame, type FieldCollector, type MarkChannels, type MarkDefinition, type MarkProvenance } from '../../contract';
import { channelValue, resolveFieldPath } from '../data';
import { isCartesianCoordinateFrame } from '../coordinate';
import { type Channel, type ExternalRow, type LinkMark, type LinkOrientationValue, type Mark, PlotMark } from '../../schemas';
import {
  DEFAULT_FILL,
  type MarkPaint,
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectPathChannelFields,
  failLoudMessage,
  pathChannelKinds,
} from './shared';

/** link 默认 cubic 控制点沿主轴外推比例（curvature 缺省；0=准直、1=最 S）；与 d3 sankeyLinkHorizontal 0.5 同序。 */
export const LINK_DEFAULT_CURVATURE = 0.5;

/** link 最大带宽（user units）：合成 width 线性 scale 的 range 上界（value 域 max → 此宽）。 */
const LINK_MAX_WIDTH = 40;

/** link 一行投影出的两端中心屏幕点（source / target 各经 frame.projectRoles）；任一端非有限 → null。 */
export type LinkEndpoints = { source: [number, number]; target: [number, number] };

/** link 一条带的几何：四角（封口两端各两点）+ 上 / 下边界 cubic 控制点（lowering 与 locator 单一真源）。 */
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

/** 取 link 一行某端点（source / target 字段对）经 frame.projectRoles 投影出的屏幕中心点；非有限 → null。 */
export const linkEndpointPoint = (endpoint: { x: Channel; y: Channel }, row: ExternalRow, frame: CoordinateFrame): [number, number] | null =>
  frame.projectRoles([channelValue(endpoint.x, row), channelValue(endpoint.y, row)]);

/** 取 link 一行源 / 目标两端中心点（任一端非有限 → null，整行跳过）。 */
export const linkEndpoints = (mark: LinkMark, row: ExternalRow, frame: CoordinateFrame): LinkEndpoints | null => {
  const source = linkEndpointPoint(mark.source, row, frame);
  const target = linkEndpointPoint(mark.target, row, frame);
  if (source === null || target === null) return null;
  return { source, target };
};

/**
 * 由源 / 目标中心 + 各端半宽 + curvature + orientation 算出一条带的四角与上 / 下边界 cubic 控制点（lowering / locator 单一真源）。
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
 * 合成 link 的 value → 半宽（user units）映射：线性 [0, maxValue] → [0, LINK_MAX_WIDTH/2]。
 */
const linkHalfWidthOf = (mark: LinkMark, rows: Array<ExternalRow>): ((value: number) => number) => {
  let maxValue = 0;
  const consider = (raw: unknown): void => {
    if (isFiniteNumber(raw) && Math.abs(raw) > maxValue) maxValue = Math.abs(raw);
  };
  for (const row of rows) {
    consider(resolveFieldPath(row, mark.value));
    if (mark.endWidth !== undefined) consider(resolveFieldPath(row, mark.endWidth));
  }
  const halfMax = LINK_MAX_WIDTH / 2;
  return value => (maxValue > 0 ? (value / maxValue) * halfMax : 0);
};

/** link 一行的 value（流量）：非有限 / 缺失 → null（跳过该行）；负值 → fail-loud（负流不静默歪曲）。 */
const linkValueOf = (row: ExternalRow, field: string): number | null => {
  const raw = resolveFieldPath(row, field);
  if (!isFiniteNumber(raw)) return null;
  if (raw < 0) {
    throw new Error(`lowerPlots: link mark requires non-negative ${field} (got ${raw}); negative flow cannot be drawn as a band width`);
  }
  return raw;
};

/**
 * 流带（link mark）下沉：每行 → 一条可填充 cubic 曲带 Path（坐标系无关端点投影 + 屏幕空间几何）。
 */
const lowerLink = (
  mark: LinkMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  colorOf: ((row: ExternalRow) => string | undefined) | undefined,
  defaultColor: string | undefined,
): IRScope | null => {
  if (mark.width !== undefined) {
    throw new Error(`lowerPlots: link mark named width scale "${mark.width}" is not supported this round; omit width for a synthesized linear scale`);
  }
  const halfWidthOf = linkHalfWidthOf(mark, rows);
  const curvature = mark.curvature ?? LINK_DEFAULT_CURVATURE;
  const fillOf = mark.fill?.kind === 'field' && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = mark.stroke?.kind === 'field' ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  const defaultFill = channelDefaultOf<MarkPaint>(channels, 'fill') ?? defaultColor ?? DEFAULT_FILL;
  const defaultStroke = channelDefaultOf<MarkPaint>(channels, 'stroke');
  const placed: Array<{ color: string | undefined; row: ExternalRow; steps: Array<IRStep> }> = [];
  for (const row of rows) {
    const value = linkValueOf(row, mark.value);
    if (value === null) continue;
    const endValue = mark.endWidth !== undefined ? linkValueOf(row, mark.endWidth) : value;
    if (endValue === null) continue;
    const halfSource = halfWidthOf(value);
    const halfTarget = halfWidthOf(endValue);
    if (!(halfSource > 1e-9) && !(halfTarget > 1e-9)) continue;
    const endpoints = linkEndpoints(mark, row, frame);
    if (endpoints === null) continue;
    const geometry = linkBandGeometry(endpoints.source, endpoints.target, halfSource, halfTarget, curvature, mark.orientation ?? 'horizontal');
    if (geometry === null) continue;
    const steps: Array<IRStep> = [
      { type: 'step', kind: 'move', to: geometry.sourceTop },
      { type: 'step', kind: 'cubic', to: geometry.targetTop, control1: geometry.topControl1, control2: geometry.topControl2 },
      { type: 'step', kind: 'line', to: geometry.targetBottom },
      { type: 'step', kind: 'cubic', to: geometry.sourceBottom, control1: geometry.bottomControl1, control2: geometry.bottomControl2 },
      { type: 'step', kind: 'cycle' },
    ];
    placed.push({ color: colorOf?.(row), row, steps });
  }
  if (placed.length === 0) return null;
  if (!colorOf) {
    const colorValue = mark.encoding.color?.value;
    const fill = colorValue !== undefined ? String(colorValue) : defaultFill;
    return {
      type: 'scope',
      pathDefault: { fill, ...(defaultStroke !== undefined ? { stroke: defaultStroke } : {}) },
      children: placed.map(p => {
        const directFill = fillOf?.(p.row);
        const directStroke = strokeOf?.(p.row);
        return applyPathChannelDeliveries({ type: 'path', ...(directFill !== undefined ? { fill: directFill } : {}), ...(directStroke !== undefined ? { stroke: directStroke } : {}), children: p.steps }, mark, p.row, channels);
      }),
    };
  }
  const groups = new Map<string, Array<IRChild>>();
  for (const { color, row, steps } of placed) {
    const fill = color ?? DEFAULT_FILL;
    const directStroke = strokeOf?.(row);
    const path: IRChild = applyPathChannelDeliveries({ type: 'path', ...(directStroke !== undefined ? { stroke: directStroke } : {}), children: steps }, mark, row, channels);
    const bucket = groups.get(fill);
    if (bucket) bucket.push(path);
    else groups.set(fill, [path]);
  }
  const children: Array<IRChild> = [...groups].map(([fill, paths]) => ({ type: 'scope', pathDefault: { fill, ...(defaultStroke !== undefined ? { stroke: defaultStroke } : {}) }, children: paths }));
  return { type: 'scope', children };
};

/** link 图层下沉：本轮仅 cartesian2D（非笛卡尔曲带形态顺延），其余坐标系 fail-loud + attachMarkLayer。 */
export const lowerLinkLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== PlotMark.Link) return null;
  if (!isCartesianCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerLink(mark, rows, frame, channels, channelValueOf<string>(channels, 'color'), channelDefaultOf<string>(channels, 'color'));
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** 收集 link mark 的端点与扩展 encoding 字段。 */
const collectLinkEncodingFields = (mark: LinkMark, fields: FieldCollector): void => {
  fields.addChannel(mark.source.x);
  fields.addChannel(mark.source.y);
  fields.addChannel(mark.target.x);
  fields.addChannel(mark.target.y);
  fields.addChannel(mark.encoding.color);
  for (const channel of Object.values(mark.encoding.channels ?? {})) {
    fields.addChannel(channel);
  }
};

/** 收集 link mark 独有字段：带宽数值与可选目标端宽度。 */
const collectLinkChannelFields = (mark: LinkMark, fields: FieldCollector): void => {
  fields.addFields(mark.value, mark.endWidth);
};

export const linkMarkDefinition: MarkDefinition<LinkMark> = {
  type: PlotMark.Link,
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectLinkEncodingFields(mark, fields);
    collectPathChannelFields(mark, fields);
    collectLinkChannelFields(mark, fields);
  },
  lower: lowerLinkLayer,
};
