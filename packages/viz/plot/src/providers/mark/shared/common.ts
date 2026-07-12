import type {
  IRChild,
  IRGeometryLabel,
  IRNode,
  IRNodeDefault,
  IRNodeLabel,
  IRPaintSpec,
  IRPath,
  IRScope,
} from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import { readSourceIndex, readSourceIndices } from '@retikz/data';

import type {
  ChannelValue,
  ChannelValueResolver,
  FieldChannel,
  FieldCollector,
  MarkChannels,
  MarkDefinition,
  MarkLoweringContext,
  MarkProvenance,
} from '../../../contract';

import { ChannelDefinitionKind, datumMeta, markLayerId, markLayerMeta } from '../../../contract';
import {
  type IRPlotAnchorIdSpec,
  type IRPlotIntervalMark,
  type IRPlotMark,
  type IRPlotMarkGeometryLabel,
  type IRPlotMarkNodeLabel,
  type IRPlotMarkOperation,
  type IRPlotPathMark,
  type IRPlotPointMark,
} from '../../../schemas';
import { BUILTIN_NODE_CHANNELS, BUILTIN_PATH_CHANNELS, labelOf } from '../../channel';

/** 折线默认描边宽度（user units）。 */
export const LINE_STROKE_WIDTH = 2;

/** 无 color 编码时的回退填充。 */
export const DEFAULT_FILL = 'currentColor';

/** mark lowering 可使用的字符串颜色或 core paint。 */
export type MarkPaint = string | IRPaintSpec;

/** 按通道名读取逐行值 resolver。 */
export const channelValueOf = <T extends ChannelValue>(
  channels: MarkChannels,
  channel: string,
): ChannelValueResolver<T> | undefined => channels.values?.[channel] as ChannelValueResolver<T> | undefined;

/** 按通道名读取已解析的默认值。 */
export const channelDefaultOf = <T extends ChannelValue>(channels: MarkChannels, channel: string): T | undefined =>
  channels.defaults?.[channel] as T | undefined;

/**
 * 把若干「已就位 node + 其颜色」按颜色分组，每色一子 Scope（fill 上提到子 Scope 的 nodeDefault）。
 * @description 颜色不逐 node 写：N 行同色 → 一个子 Scope 设 fill，IR 体积 O(色数) 而非 O(行数)。
 */
export const colorGroupedScope = (
  placed: Array<{ color: string | undefined; node: IRNode }>,
  styleFor: (fill: string) => IRNodeDefault,
): IRScope => {
  const groups = new Map<string, Array<IRNode>>();
  for (const { color, node } of placed) {
    const fill = color ?? DEFAULT_FILL;
    const bucket = groups.get(fill);
    if (bucket) bucket.push(node);
    else groups.set(fill, [node]);
  }
  const children: Array<IRChild> = [...groups].map(([fill, nodes]) => ({
    type: 'scope',
    nodeDefault: styleFor(fill),
    children: nodes,
  }));
  return { type: 'scope', children };
};

/** 收集 mark 上可直接提升为 Node 默认样式的常量值。 */
export const constantNodeStyleOverrides = (mark: IRPlotMark): Partial<IRNodeDefault> => {
  const stroke = 'stroke' in mark && mark.stroke?.kind === 'constant' ? mark.stroke.value : undefined;
  const strokeWidth =
    'strokeWidth' in mark && mark.strokeWidth?.kind === 'constant' ? mark.strokeWidth.value : undefined;
  const fillOpacity =
    'fillOpacity' in mark && mark.fillOpacity?.kind === 'constant' ? mark.fillOpacity.value : undefined;
  const opacity = 'opacity' in mark && mark.opacity?.kind === 'constant' ? mark.opacity.value : undefined;
  return {
    ...(stroke !== undefined ? { stroke } : {}),
    ...(strokeWidth !== undefined ? { strokeWidth } : {}),
    ...(fillOpacity !== undefined ? { fillOpacity } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
  };
};

/**
 * datum node 装饰器：provenance 开时给 node 挂 per-datum meta（datumProvenance）+ datum id（datumIdField）。
 * @description 关 provenance / 无 markProvenance → 原样返回，不写 id/meta。
 */
export const decorateDatum = (
  node: IRNode,
  row: ExternalRow,
  transformedIndex: number,
  markType: string,
  markProvenance: MarkProvenance | undefined,
  seriesValue: unknown,
): IRNode => {
  if (!markProvenance) return node;
  const { context, markIndex, registerDatumId } = markProvenance;
  const decorated: IRNode = { ...node };
  if (context.datumProvenance) {
    decorated.meta = datumMeta(
      context,
      markType,
      markIndex,
      transformedIndex,
      readSourceIndex(row),
      seriesValue,
      readSourceIndices(row),
    );
  }
  const datumId = registerDatumId?.(row);
  if (datumId !== undefined) decorated.id = datumId;
  return decorated;
};

type LabelText = IRNodeLabel['text'];
type MarkLabelFieldSource =
  | IRPlotMarkNodeLabel
  | IRPlotMarkGeometryLabel
  | ReadonlyArray<IRPlotMarkNodeLabel>
  | ReadonlyArray<IRPlotMarkGeometryLabel>
  | ReadonlyArray<IRPlotMarkNodeLabel | IRPlotMarkGeometryLabel>
  | undefined;
type MarkLabelFieldEntry = IRPlotMarkNodeLabel | IRPlotMarkGeometryLabel;

const normalizeNodeLabels = (
  labels: IRPlotMarkNodeLabel | ReadonlyArray<IRPlotMarkNodeLabel> | undefined,
): Array<IRPlotMarkNodeLabel> => {
  if (labels === undefined) return [];
  return Array.isArray(labels) ? [...(labels as ReadonlyArray<IRPlotMarkNodeLabel>)] : [labels as IRPlotMarkNodeLabel];
};

const normalizeGeometryLabels = (
  labels: IRPlotMarkGeometryLabel | ReadonlyArray<IRPlotMarkGeometryLabel> | undefined,
): Array<IRPlotMarkGeometryLabel> => {
  if (labels === undefined) return [];
  return Array.isArray(labels)
    ? [...(labels as ReadonlyArray<IRPlotMarkGeometryLabel>)]
    : [labels as IRPlotMarkGeometryLabel];
};

const normalizeLabelFieldEntries = (labels: MarkLabelFieldSource): Array<MarkLabelFieldEntry> => {
  if (labels === undefined) return [];
  return Array.isArray(labels) ? [...(labels as ReadonlyArray<MarkLabelFieldEntry>)] : [labels as MarkLabelFieldEntry];
};

const omitContent = <T extends { content: unknown }>(label: T): Omit<T, 'content'> =>
  Object.fromEntries(Object.entries(label).filter(([key]) => key !== 'content')) as Omit<T, 'content'>;

const textForLabel = (
  label: IRPlotMarkNodeLabel | IRPlotMarkGeometryLabel,
  row: ExternalRow,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
  index: number,
): LabelText | undefined => {
  if (index === 0 && labelResolver !== undefined) return labelResolver(row);
  return labelOf(label.content, row);
};

const normalizeResolvedLabels = <T>(labels: Array<T>): T | Array<T> | undefined => {
  if (labels.length === 0) return undefined;
  return labels.length === 1 ? labels[0] : labels;
};

const normalizeNodeLabelPosition = (position: IRNodeLabel['position']): IRNodeLabel['position'] => {
  if (position === undefined) return undefined;
  if (typeof position !== 'string') {
    return position;
  }
  if (position === 'center') return position;
  return position;
};

const normalizeNodeLabel = (label: IRNodeLabel): IRNodeLabel => {
  const position = normalizeNodeLabelPosition(label.position);
  if (position === label.position) return label;
  const next: IRNodeLabel = { ...label };
  if (position === undefined) {
    delete next.position;
  } else {
    next.position = position;
  }
  return next;
};

const normalizeGeometryLabel = (label: IRGeometryLabel): IRGeometryLabel => {
  if (label.side === undefined) return label;
  const side = label.side;
  return side === label.side ? label : { ...label, side };
};

/** 把 plot Node label 配置解析为 core Node label。 */
export const resolveNodeMarkLabels = (
  labels: IRPlotMarkNodeLabel | ReadonlyArray<IRPlotMarkNodeLabel> | undefined,
  row: ExternalRow,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
): IRNode['label'] | undefined => {
  const resolved = normalizeNodeLabels(labels).flatMap((label, index): Array<IRNodeLabel> => {
    const text = textForLabel(label, row, labelResolver, index);
    if (text === undefined) return [];
    return [normalizeNodeLabel({ ...omitContent(label), text })];
  });
  return normalizeResolvedLabels(resolved);
};

/** 把 plot geometry label 配置解析为 core Path label。 */
export const resolveGeometryMarkLabels = (
  labels: IRPlotMarkGeometryLabel | ReadonlyArray<IRPlotMarkGeometryLabel> | undefined,
  row: ExternalRow,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
): IRPath['label'] | undefined => {
  const resolved = normalizeGeometryLabels(labels).flatMap((label, index): Array<IRGeometryLabel> => {
    const text = textForLabel(label, row, labelResolver, index);
    if (text === undefined) return [];
    return [normalizeGeometryLabel({ ...omitContent(label), text })];
  });
  return normalizeResolvedLabels(resolved);
};

/**
 * priority-1 宿主 label：若位置 mark 带 `label` 且该行解析出内容，给 datum Node 填 core NodeLabelSchema。
 * @description 零新建 Node：position / distance / pin 直接落 core label（边框相对定位 + 引线由 core 负责）。
 */
export const attachDatumLabel = (
  node: IRNode,
  mark: PositionEncodedMark,
  row: ExternalRow,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
): IRNode => {
  if (!('label' in mark) || mark.label === undefined) return node;
  const label = resolveNodeMarkLabels(
    mark.label as IRPlotMarkNodeLabel | ReadonlyArray<IRPlotMarkNodeLabel> | undefined,
    row,
    labelResolver,
  );
  return label === undefined ? node : { ...node, label };
};

/** 把已解析的 Node 通道值交付到单个 core Node。 */
export const applyNodeChannelDeliveries = (
  node: IRNode,
  mark: IRPlotMark,
  row: ExternalRow,
  channels: MarkChannels,
  nodeKind: 'pointGlyph' | 'pointText' | 'cell',
): void => {
  for (const entry of channels.nodeDeliveries ?? []) {
    const value = entry.resolver(row);
    if (value !== undefined) entry.deliver(node, value, { mark, row, nodeKind });
  }
};

/** 把已解析的 Path 通道值交付到单个 core Path。 */
export const applyPathChannelDeliveries = (
  path: IRPath,
  mark: IRPlotMark,
  row: ExternalRow,
  channels: MarkChannels,
): IRPath => {
  for (const entry of channels.pathDeliveries ?? []) {
    const value = entry.resolver(row);
    if (value !== undefined) entry.deliver(path, value, { mark, row });
  }
  return path;
};

/**
 * 给图层外层 Scope 挂 layer id + meta（provenance 开时）；关 → 原样返回。
 */
export const attachMarkLayer = (
  layer: IRScope,
  mark: IRPlotMark,
  markProvenance: MarkProvenance | undefined,
): IRScope => {
  if (!markProvenance) return layer;
  const { context, markIndex } = markProvenance;
  const id = markLayerId(context.plotId, mark.id, markIndex);
  return {
    ...layer,
    ...(id !== undefined ? { id } : {}),
    meta: markLayerMeta(mark.type, markIndex),
  };
};

/**
 * 坐标系不支持某 mark 的统一 fail-loud 文案（含 mark.type / frame.type，便于定位）。
 */
export const failLoudMessage = (markType: string, frameType: string): string =>
  `lowerPlots: ${markType} mark is not supported under the ${frameType} coordinate system (this coordinate system does not provide the geometry for ${markType} marks this round)`;

type PositionEncodedMark = IRPlotPointMark | IRPlotPathMark | IRPlotIntervalMark;

const anchorOwnerOf = (
  mark: PositionEncodedMark,
  transformedIndex: number,
  ctx: MarkLoweringContext,
  role?: string,
) => ({
  markType: mark.type,
  markId: mark.id,
  markIndex: ctx.markIndex,
  transformedIndex,
  ...(role !== undefined ? { role } : {}),
});

/** 按图元锚点配置为 datum 图元注册稳定 id。 */
export const attachDatumAnchor = (
  node: IRNode,
  mark: PositionEncodedMark,
  row: ExternalRow,
  transformedIndex: number,
  ctx: MarkLoweringContext | undefined,
  role?: string,
): IRNode => {
  if (mark.anchorId === undefined || ctx?.anchors === undefined) return node;
  const owner = anchorOwnerOf(mark, transformedIndex, ctx, role);
  const id = ctx.anchors.makeId(mark.anchorId, row, owner);
  ctx.anchors.register(id, owner);
  return { ...node, id };
};

/**
 * shared encoding 中保留给非位置语义的 key。
 * @description 其它 encoding key 一律视为 coordinate role，避免把位置收集写死成 x/y/z 后漏掉自定义坐标系 role。
 */
const nonPositionEncodingKeys = new Set(['color', 'text', 'channels']);

/**
 * 收集坐标 role 字段。
 * @description 不写死 x/y/z：自定义 coordinate 可以声明自己的 role，mark.encoding 中除内置非位置槽位外都按 position role 处理。
 */
export const collectPositionRoleFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  for (const [key, channel] of Object.entries(mark.encoding)) {
    if (nonPositionEncodingKeys.has(key)) continue;
    fields.addChannel(channel);
  }
};

/**
 * 收集 encoding 中的非位置通道字段。
 * @description `encoding.color` 是内置 paint 的兼容入口；`encoding.channels` 是自定义通道入口。二者都不参与 coordinate role 投影。
 */
export const collectEncodingChannelFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  if ('color' in mark.encoding) fields.addChannel(mark.encoding.color);
  for (const channel of Object.values(mark.encoding.channels ?? {})) {
    fields.addChannel(channel);
  }
};

/**
 * 收集 datum label 引用的字段。
 * @description label 挂在 mark 顶层，但内容仍可能绑定数据字段；它不是位置 role，也不是 channel delivery。
 */
export const collectDatumLabelFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  for (const label of normalizeLabelFieldEntries(mark.label)) fields.addChannel(label.content);
};

/** 收集 plot label 内容绑定引用的源字段。 */
export const collectMarkLabelFields = (label: MarkLabelFieldSource, fields: FieldCollector): void => {
  for (const entry of normalizeLabelFieldEntries(label)) fields.addChannel(entry.content);
};

/** 收集锚点 id 配置引用的源字段。 */
export const collectAnchorIdFields = (anchorId: IRPlotAnchorIdSpec | undefined, fields: FieldCollector): void => {
  if (anchorId === undefined) return;
  fields.addField(anchorId.field);
  if (anchorId.template === undefined) return;
  for (const match of anchorId.template.matchAll(/\{field:([^}]+)\}/g)) fields.addField(match[1]);
};

/**
 * 位置类 mark 的通用 encoding 字段收集入口。
 * @description point / path / interval 共用 shared encoding；具体样式字段再由 node/path channel definition 派生收集。
 */
export const collectCommonEncodingFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  collectPositionRoleFields(mark, fields);
  collectEncodingChannelFields(mark, fields);
  collectDatumLabelFields(mark, fields);
  collectAnchorIdFields(mark.anchorId, fields);
};

type ChannelDefinitionMap = Readonly<Record<string, { channel: string }>>;

/**
 * 根据 channel definition 的注册名收集 mark 顶层同名字段。
 * @description node/path 内置通道名由 channel 层单一维护；mark 侧只声明自己消费哪类 channel，避免再维护一份平行字段列表。
 */
const collectChannelDefinitionFields = (
  mark: IRPlotMarkOperation,
  fields: FieldCollector,
  definitions: ChannelDefinitionMap,
): void => {
  const record = mark as Record<string, FieldChannel | undefined>;
  for (const def of Object.values(definitions)) fields.addChannel(record[def.channel]);
};

/** 收集当前 mark 消费的内置 Node channel 字段。 */
export const collectNodeChannelFields = (mark: IRPlotMarkOperation, fields: FieldCollector): void =>
  collectChannelDefinitionFields(mark, fields, BUILTIN_NODE_CHANNELS);

/** 收集当前 mark 消费的内置 Path channel 字段。 */
export const collectPathChannelFields = (mark: IRPlotMarkOperation, fields: FieldCollector): void =>
  collectChannelDefinitionFields(mark, fields, BUILTIN_PATH_CHANNELS);

/** Node 类 mark 默认可消费的通道类型集合。 */
export const nodeChannelKinds = (): ReturnType<NonNullable<MarkDefinition['channelKinds']>> =>
  new Set([ChannelDefinitionKind.Mark, ChannelDefinitionKind.Scope, ChannelDefinitionKind.Node]);

/** Path 类 mark 默认可消费的通道类型集合。 */
export const pathChannelKinds = (): ReturnType<NonNullable<MarkDefinition['channelKinds']>> =>
  new Set([ChannelDefinitionKind.Mark, ChannelDefinitionKind.Scope, ChannelDefinitionKind.Path]);
