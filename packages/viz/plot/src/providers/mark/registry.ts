import type { IRChild, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import { JsonObjectSchema } from '@retikz/core';

import type {
  AnyMarkDefinition,
  CoordinateFrame,
  FieldCollector,
  IntervalContext,
  MarkChannels,
  MarkDefinition,
  MarkLoweringContext,
} from '../../contract';
import type { IRPlotMark, IRPlotMarkOperation, PlotMarkValue } from '../../schemas';

import { extractMarkType } from '../../contract';
import { PlotMark } from '../../schemas';
import {
  intervalMarkDefinition,
  pathMarkDefinition,
  pointMarkDefinition,
  referenceMarkDefinition,
  relationMarkDefinition,
} from './features';
import { cellAnchor, roleAnchor } from './shared';

const asAnyMarkDefinition = <T extends IRPlotMarkOperation>(def: MarkDefinition<T>): AnyMarkDefinition => def;

/**
 * mark lowering 行为注册表：每个内置 mark 对应一个注册项（lowerMark 按 type 查表分发）。
 * @description 对齐仓库已有 composite / coordinate 工厂注册范式；新增内置 mark = 加一条注册项，不改 lowerMark。
 *   Plot mark schema 仍是静态单一真源，不由此表组装
 */
export const MARK_REGISTRY: Record<PlotMarkValue, AnyMarkDefinition> = {
  [PlotMark.Point]: asAnyMarkDefinition(pointMarkDefinition),
  [PlotMark.Path]: asAnyMarkDefinition(pathMarkDefinition),
  [PlotMark.Interval]: asAnyMarkDefinition(intervalMarkDefinition),
  [PlotMark.Reference]: asAnyMarkDefinition(referenceMarkDefinition),
  [PlotMark.Relation]: asAnyMarkDefinition(relationMarkDefinition),
};

/** 内置 mark definition registry（按 type 索引）；内置与自定义 mark 共享同一分派流程 */
const BUILTIN_MARK_REGISTRY: ReadonlyMap<string, AnyMarkDefinition> = new Map(
  Object.values(MARK_REGISTRY).map(def => [extractMarkType(def.schema), def] as const),
);

/** 内置 mark definition 列表；主要供诊断与测试确认内置覆盖。自定义 definition 不写入此表，而是在每次 lowering 时合并 */
export const BUILTIN_MARKS: ReadonlyArray<AnyMarkDefinition> = Object.values(MARK_REGISTRY);

/**
 * 解析 mark registry。
 * @description 内置 mark 总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复
 */
export const resolveMarkRegistry = (custom?: ReadonlyArray<AnyMarkDefinition>): Map<string, AnyMarkDefinition> => {
  const registry = new Map<string, AnyMarkDefinition>(BUILTIN_MARK_REGISTRY);
  for (const def of custom ?? []) {
    const type = extractMarkType(def.schema);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate mark registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};

/** 查找 mark definition；未知 type 必须 fail-loud，避免静默跳过图元下沉 */
const markDefinitionOf = (
  mark: IRPlotMarkOperation,
  registry: ReadonlyMap<string, AnyMarkDefinition>,
): AnyMarkDefinition => {
  const def = registry.get(mark.type);
  if (def === undefined) {
    throw new Error(
      `lowerPlots: mark type "${mark.type}" is not registered; pass a MarkDefinition via options.markDefinitions`,
    );
  }
  return def;
};

/** 通过匹配的 definition schema 解析 mark，并再次确认解析结果仍为 JSON object */
const parseMarkOperation = (
  mark: IRPlotMarkOperation,
  registry: ReadonlyMap<string, AnyMarkDefinition>,
): { definition: AnyMarkDefinition; operation: never } => {
  JsonObjectSchema.parse(mark);
  const definition = markDefinitionOf(mark, registry);
  const operation = definition.schema.parse(mark);
  JsonObjectSchema.parse(operation);
  return { definition, operation: operation as never };
};

/** 通过匹配的 mark definition 收集图元引用的源字段 */
export const collectMarkFields = (
  mark: IRPlotMarkOperation,
  fields: FieldCollector,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): void => {
  const { definition, operation } = parseMarkOperation(mark, registry);
  definition.collectFields?.(operation, fields);
};

/** 返回匹配 mark definition 声明的可消费通道类型 */
export const channelKindsForMark = (
  mark: IRPlotMarkOperation,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): ReturnType<NonNullable<AnyMarkDefinition['channelKinds']>> | undefined => {
  const { definition, operation } = parseMarkOperation(mark, registry);
  return definition.channelKinds?.(operation);
};

/**
 * 解析 datum 锚点：cell 类 mark 通过 definition.buildCell 取逻辑 cell，其余内置 mark 走 role 投影。
 * @description registry 层负责查 definition，shared 层只提供纯投影 helper，避免 shared 反向依赖 interval feature
 */
export const datumAnchor = (
  mark: IRPlotMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): [number, number] | null => {
  const { definition, operation } = parseMarkOperation(mark, registry);
  if (definition.buildCell !== undefined) {
    return cellAnchor(definition.buildCell(operation, row, frame, ctx), frame);
  }
  return roleAnchor(operation, row, frame);
};

const isScopeLayer = (layer: IRChild | null): layer is IRScope =>
  layer !== null && layer.type === 'scope' && 'children' in layer;

const applyScopeChannelDeliveries = (
  layer: IRChild | null,
  mark: IRPlotMarkOperation,
  rows: Array<ExternalRow>,
  channels: MarkChannels,
): IRChild | null => {
  if (!isScopeLayer(layer)) return layer;
  for (const entry of channels.scopeDeliveries ?? []) {
    entry.deliver(layer, entry.value, { mark, rows });
  }
  return layer;
};

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope（按 mark type 查 registry 分发）。
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   color 编码时按颜色分子 Scope；series 把记录拆成多系列（多线 / 分组 / 堆叠柱）。无可绘制图元返回 null。
 *   markProvenance 给定（provenance 开）→ 给图层 / series Path / datum Node 绑 id + 来源 meta
 */
export const lowerMark = (
  mark: IRPlotMarkOperation,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels = {},
  markContext?: MarkLoweringContext,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): IRChild | null => {
  const { definition, operation } = parseMarkOperation(mark, registry);
  return applyScopeChannelDeliveries(
    definition.lower(operation, rows, frame, channels, markContext),
    operation,
    rows,
    channels,
  );
};
