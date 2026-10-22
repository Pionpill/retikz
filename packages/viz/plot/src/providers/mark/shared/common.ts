import type {
  IRChild,
  IRGeometryLabel,
  IRNode,
  IRNodeDefault,
  IRNodeLabel,
  IRPaint,
  IRPath,
  IRScope,
} from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { readSourceIndex, readSourceIndices } from '@retikz/data';

import type {
  AnchorOwner,
  MarkInstance,
  ChannelValue,
  ChannelValueResolver,
  FieldCollector,
  MarkChannels,
  MarkDefinition,
  MarkLoweringContext,
  MarkProvenance,
} from '../../../contract';
import {
  labelEntries,
  labelEncodingBindings,
  ChannelDefinitionKind,
  datumMeta,
  markLayerId,
  markLayerMeta,
  markProperty,
  positionField,
  markPositionInputs,
  markChannelEncoding,
} from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotMarkOpacityStyle } from '../../../schemas';
import type {
  IRPlotLabelEncoding,
  IRPlotAnchorId,
  IRPlotChannel,
  IRPlotIntervalMark,
  IRPlotMark,
  IRPlotMarkGeometryLabel,
  IRPlotMarkNodeLabel,
  IRPlotMarkOperation,
  IRPlotPathMark,
  IRPlotPointMark,
} from '../../../schemas';
import { BUILTIN_NODE_CHANNELS, BUILTIN_PATH_CHANNELS, labelOf } from '../../channel';

/** 折线默认描边宽度（user units） */
export const LINE_STROKE_WIDTH = 2;

/** 无 color 编码时的回退填充 */
export const DEFAULT_FILL = 'currentColor';

/** mark lowering 可使用的字符串颜色或 core paint */
export type MarkPaint = string | IRPaint;

/**
 * 按通道名读取逐行值 resolver
 * @template T 调用方按已知通道契约读取的视觉值类型
 */
export const channelValueOf = <T extends ChannelValue>(
  channels: MarkChannels,
  channel: string,
): ChannelValueResolver<T> | undefined => channels.values?.[channel] as ChannelValueResolver<T> | undefined;

/**
 * 按通道名读取已解析的默认值
 * @template T 调用方按已知通道契约读取的默认视觉值类型
 */
export const channelDefaultOf = <T extends ChannelValue>(channels: MarkChannels, channel: string): T | undefined =>
  channels.defaults?.[channel] as T | undefined;

/**
 * 把若干「已就位 node + 其颜色」按颜色分组，每色一子 Scope（fill 上提到子 Scope 的 nodeDefault）
 * @description 颜色不逐 node 写：N 行同色 → 一个子 Scope 设 fill，IR 体积 O(色数) 而非 O(行数)
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
    children: nodes,
    defaults: { node: styleFor(fill) },
  }));

  return { type: 'scope', children };
};

/** 提取透明度常量因子，字段绑定留给通道解析 */
export const constantMarkOpacity = (
  opacity: IRPlotMarkOpacityStyle | undefined,
): NonNullable<IRNodeDefault['style']>['opacity'] => {
  return opacity;
};

/** 收集 mark 上可直接提升为 Node 默认样式的常量值 */
export const constantNodeStyleOverrides = (mark: IRPlotMark): Partial<IRNodeDefault> => {
  const stroke = markProperty<MarkPaint>(mark, 'stroke');
  const strokeWidth = markProperty<number>(mark, 'strokeWidth');
  const opacity = Object.fromEntries(
    (['opacity', 'fillOpacity', 'strokeOpacity'] as const).flatMap((target, index) => {
      const value = markProperty<number>(mark, target);
      return value === undefined ? [] : [[['overall', 'fill', 'stroke'][index], value]];
    }),
  );

  return {
    style: {
      ...(stroke === undefined ? {} : { stroke }),
      ...(strokeWidth === undefined ? {} : { strokeWidth }),
      ...(Object.keys(opacity).length === 0 ? {} : { opacity }),
    },
  };
};

/**
 * datum node 装饰器：provenance 开时给 node 挂 per-datum meta（datumProvenance）+ datum id（datumIdField）
 * @description 关 provenance / 无 markProvenance → 原样返回，不写 id/meta
 */
export const decorateDatum = <T extends IRNode | IRPath>(
  node: T,
  row: ExternalRow,
  transformedIndex: number,
  markType: string,
  markProvenance: MarkProvenance | undefined,
  seriesValue: unknown,
): T => {
  if (!markProvenance) return node;

  const { context, markIndex, registerDatumId } = markProvenance;
  const decorated = { ...node };
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

type MarkLabelFieldSource = string | IRPlotLabelEncoding | ReadonlyArray<string | IRPlotLabelEncoding> | undefined;

const omitContent = <T extends { content?: unknown; displayFormat?: unknown }>(
  label: T,
): Omit<T, 'content' | 'displayFormat'> =>
  Object.fromEntries(Object.entries(label).filter(([key]) => key !== 'content' && key !== 'displayFormat')) as Omit<
    T,
    'content' | 'displayFormat'
  >;

const textForLabel = (
  label: IRPlotMarkNodeLabel | IRPlotMarkGeometryLabel,
  row: ExternalRow | undefined,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
  index: number,
  field?: string,
): LabelText | undefined => {
  if (row === undefined) return label.content;
  if (index === 0 && labelResolver !== undefined) return labelResolver(row);
  return labelOf(label.content, row, undefined, undefined, field, label.displayFormat);
};

const collapseResolvedLabels = <T>(labels: Array<T>): T | Array<T> | undefined => {
  if (labels.length === 0) return undefined;
  return labels.length === 1 ? labels[0] : labels;
};

/** 把 plot Node label 配置解析为 core Node label */
export const resolveNodeMarkLabels = (
  labels: string | IRPlotMarkNodeLabel | ReadonlyArray<string | IRPlotMarkNodeLabel> | undefined,
  row: ExternalRow | undefined,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
  encodings?: MarkLabelFieldSource,
  channels?: MarkChannels,
): IRNode['label'] | undefined => {
  const bindings = labelEntries(encodings);
  const hosts = labelEntries(labels);
  const resolved = Array.from(
    { length: Math.max(hosts.length, bindings.length) },
    (_, index) => hosts[index] ?? {},
  ).flatMap((label, index): Array<IRNodeLabel> => {
    const text = textForLabel(label, row, labelResolver, index, bindings[index]?.content);
    if (text === undefined) return [];
    const output: IRNodeLabel = { ...omitContent(label), text };
    if (row !== undefined)
      for (const delivery of channels?.labelDeliveries ?? []) if (delivery.index === index) delivery.apply(output, row);
    if (output.placement === 'inside' && output.pin)
      throw new RetikzPlotError(`Node label[${index}] violates host constraints: pin requires outside placement`);
    return [output];
  });
  return collapseResolvedLabels(resolved);
};

/** 把 plot geometry label 配置解析为 core Path label */
export const resolveGeometryMarkLabels = (
  labels: string | IRPlotMarkGeometryLabel | ReadonlyArray<string | IRPlotMarkGeometryLabel> | undefined,
  row: ExternalRow | undefined,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
  encodings?: MarkLabelFieldSource,
  channels?: MarkChannels,
): IRPath['label'] | undefined => {
  const bindings = labelEntries(encodings);
  const hosts = labelEntries(labels);
  const resolved = Array.from(
    { length: Math.max(hosts.length, bindings.length) },
    (_, index) => hosts[index] ?? {},
  ).flatMap((label, index): Array<IRGeometryLabel> => {
    const text = textForLabel(label, row, labelResolver, index, bindings[index]?.content);
    if (text === undefined) return [];
    const output: IRGeometryLabel = { ...omitContent(label), text: typeof text === 'string' ? text : [text] };
    if (row !== undefined)
      for (const delivery of channels?.labelDeliveries ?? []) if (delivery.index === index) delivery.apply(output, row);

    return [output];
  });
  return collapseResolvedLabels(resolved);
};

/**
 * priority-1 宿主 label：若位置 mark 带 `label` 且该行解析出内容，给 datum Node 填 core NodeLabelSchema
 * @description 零新建 Node：position / distance / pin 直接落 core label（边框相对定位 + 引线由 core 负责）
 */
export const attachDatumLabel = (
  node: IRNode,
  mark: PositionEncodedMark,
  row: ExternalRow,
  labelResolver: ChannelValueResolver<LabelText> | undefined,
  channels?: MarkChannels,
): IRNode => {
  if (mark.properties?.label === undefined && mark.encodings?.label === undefined) return node;

  const label = resolveNodeMarkLabels(
    mark.properties?.label as string | IRPlotMarkNodeLabel | ReadonlyArray<string | IRPlotMarkNodeLabel> | undefined,
    row,
    labelResolver,
    mark.encodings?.label,
    channels,
  );

  return label === undefined ? node : { ...node, label };
};

/** 把已解析的 Node 通道值交付到单个 core Node */
export const applyNodeChannelDeliveries = (
  node: IRNode,
  mark: IRPlotMarkOperation,
  row: ExternalRow,
  channels: MarkChannels,
  nodeKind: 'pointGlyph' | 'pointText' | 'cell',
): void => {
  for (const entry of channels.nodeDeliveries ?? []) {
    const value = entry.resolver(row);
    if (value !== undefined) entry.deliver(node, value, { mark, row, nodeKind });
  }
};

/** 把已解析的 Path 通道值交付到单个 core Path */
export const applyPathChannelDeliveries = (
  path: IRPath,
  mark: IRPlotMarkOperation,
  row: ExternalRow | undefined,
  channels: MarkChannels,
): IRPath => {
  if (row === undefined) return path;
  for (const entry of channels.pathDeliveries ?? []) {
    const value = entry.resolver(row);
    if (value !== undefined) entry.deliver(path, value, { mark, row });
  }

  return path;
};

/** 给图层外层 Scope 挂显式 mark id，并在 provenance 开启时补齐合成 id 与来源 meta */
export const attachMarkLayer = (
  layer: IRScope,
  mark: Pick<IRPlotMark, 'id' | 'type'>,
  layerContext: MarkProvenance | MarkLoweringContext | undefined,
): IRScope => {
  const markContext = layerContext !== undefined && 'context' in layerContext ? undefined : layerContext;
  const markProvenance =
    layerContext !== undefined && 'context' in layerContext ? layerContext : layerContext?.provenance;
  const explicitId =
    mark.id !== undefined && layerContext !== undefined
      ? markLayerId(markContext?.plotId ?? markProvenance?.context.plotId, mark.id, layerContext.markIndex)
      : undefined;
  if (!markProvenance) return explicitId === undefined ? layer : { ...layer, id: explicitId };

  const { context, markIndex } = markProvenance;
  const id = markLayerId(context.plotId, mark.id, markIndex);

  return {
    ...layer,
    ...(id !== undefined ? { id } : {}),
    meta: markLayerMeta(mark.type, markIndex),
  };
};

/**
 * 坐标系不支持某 mark 的统一 fail-loud 文案（含 mark.type / frame.type，便于定位）
 */
export const failLoudMessage = (markType: string, frameType: string): string =>
  `lowerPlots: ${markType} mark is not supported under the ${frameType} coordinate system (this coordinate system does not provide the geometry for ${markType} marks this round)`;

type PositionEncodedMark = IRPlotPointMark | IRPlotPathMark | IRPlotIntervalMark;

/** 按真实实例身份注册节点或完整路径锚点 */
export const attachMarkAnchor = <T extends IRNode | IRPath>(
  node: T,
  mark: PositionEncodedMark,
  instance: MarkInstance,
  ctx: MarkLoweringContext | undefined,
  role?: string,
): T => {
  if ((mark.properties?.anchorId === undefined && mark.encodings?.anchorId === undefined) || ctx?.anchors === undefined)
    return node;
  const owner: AnchorOwner = {
    markType: mark.type,
    markId: mark.id,
    markIndex: ctx.markIndex,
    role,
    ...(instance.kind === 'single' ? { kind: 'single' } : { kind: 'row', transformedIndex: instance.transformedIndex }),
  };
  const id = ctx.anchors.makeId(mark.properties?.anchorId ?? {}, instance, owner, mark.encodings?.anchorId);
  ctx.anchors.register(id, owner);
  return { ...node, id };
};

/** 收集坐标角色字段 */
export const collectPositionRoleFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  for (const position of markPositionInputs(mark))
    for (const input of Object.values(position)) fields.addField(positionField(input));
};

/** 收集注册的直接视觉字段目标，结构目标由其宿主收集 */
export const collectEncodingChannelFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  for (const [target, binding] of Object.entries(mark.encodings ?? {})) {
    if (['position', 'from', 'to', 'opacity', 'label', 'bounds', 'closure'].includes(target)) continue;
    fields.addChannel(binding as IRPlotChannel | undefined);
  }
};

/**
 * 收集 datum label 引用的字段
 * @description label 挂在 mark 顶层，但内容仍可能绑定数据字段；它不是位置 role，也不是 channel delivery
 */
export const collectDatumLabelFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  collectMarkLabelFields(mark.encodings?.label, fields);
};

/** 收集标签内容及已声明叶子编码的字段依赖 */
export const collectMarkLabelFields = (label: MarkLabelFieldSource, fields: FieldCollector): void => {
  for (const entry of labelEntries(label)) {
    fields.addField(entry.content);
    for (const [, binding] of labelEncodingBindings(entry)) fields.addChannel(binding);
  }
};

/** 收集锚点 id 配置引用的源字段 */
export const collectAnchorIdFields = (anchorId: IRPlotAnchorId | undefined, fields: FieldCollector): void => {
  if (anchorId === undefined) return;

  if (anchorId.template === undefined) return;

  for (const match of anchorId.template.matchAll(/\{field:([^}]+)\}/g)) fields.addField(match[1]);
};

/**
 * 位置类 mark 的通用 encoding 字段收集入口
 * @description point / path / interval 共用 shared encoding；具体样式字段再由 node/path channel definition 派生收集
 */
export const collectCommonEncodingFields = (mark: PositionEncodedMark, fields: FieldCollector): void => {
  collectPositionRoleFields(mark, fields);
  collectEncodingChannelFields(mark, fields);
  collectDatumLabelFields(mark, fields);
  collectAnchorIdFields(mark.properties?.anchorId, fields);
  fields.addField(mark.encodings?.anchorId);
};

type ChannelDefinitionMap = Readonly<Record<string, { channel: string }>>;

/**
 * 根据 channel definition 的注册名收集 mark 顶层同名字段
 * @description node/path 内置通道名由 channel 层单一维护；mark 侧只声明自己消费哪类 channel，避免再维护一份平行字段列表
 */
const collectChannelDefinitionFields = (
  mark: IRPlotMarkOperation,
  fields: FieldCollector,
  definitions: ChannelDefinitionMap,
): void => {
  for (const def of Object.values(definitions)) fields.addChannel(markChannelEncoding(mark, def.channel));
};

/** 收集当前 mark 消费的内置 Node channel 字段 */
export const collectNodeChannelFields = (mark: IRPlotMarkOperation, fields: FieldCollector): void =>
  collectChannelDefinitionFields(mark, fields, BUILTIN_NODE_CHANNELS);

/** 收集当前 mark 消费的内置 Path channel 字段 */
export const collectPathChannelFields = (mark: IRPlotMarkOperation, fields: FieldCollector): void =>
  collectChannelDefinitionFields(mark, fields, BUILTIN_PATH_CHANNELS);

/** Node 类 mark 默认可消费的通道类型集合 */
export const nodeChannelKinds = (): ReturnType<NonNullable<MarkDefinition['channelKinds']>> =>
  new Set([
    ChannelDefinitionKind.Mark,
    ChannelDefinitionKind.Scope,
    ChannelDefinitionKind.Node,
    ChannelDefinitionKind.Label,
  ]);

/** Path 类 mark 默认可消费的通道类型集合 */
export const pathChannelKinds = (): ReturnType<NonNullable<MarkDefinition['channelKinds']>> =>
  new Set([
    ChannelDefinitionKind.Mark,
    ChannelDefinitionKind.Scope,
    ChannelDefinitionKind.Path,
    ChannelDefinitionKind.Label,
  ]);
