import { type IRChild, type IRScope } from '@retikz/core';
import { type AnyMarkDefinition, type CoordinateFrame, type FieldCollector, type IntervalContext, type MarkChannels, type MarkDefinition, type MarkProvenance } from '../../contract';
import { type ExternalRow, type Mark, type MarkOperation, PlotMark, type PlotMarkValue } from '../../schemas';
import { intervalMarkDefinition, pathMarkDefinition, pointMarkDefinition, referenceMarkDefinition } from './features';
import { cellAnchor, roleAnchor } from './shared';

const asAnyMarkDefinition = <T extends MarkOperation>(def: MarkDefinition<T>): AnyMarkDefinition => def as unknown as AnyMarkDefinition;

/**
 * mark lowering 行为注册表：内置 6 个 mark = 6 个内置注册项（lowerMark 按 type 查表分发）。
 * @description 对齐仓库已有 composite / coordinate 工厂注册范式；新增内置 mark = 加一条注册项，不改 lowerMark。
 *   IR schema 仍是 ir/mark.ts 静态单一真源（不由此表组装）。
 */
export const MARK_REGISTRY: Record<PlotMarkValue, AnyMarkDefinition> = {
  [PlotMark.Point]: asAnyMarkDefinition(pointMarkDefinition),
  [PlotMark.Path]: asAnyMarkDefinition(pathMarkDefinition),
  [PlotMark.Interval]: asAnyMarkDefinition(intervalMarkDefinition),
  [PlotMark.Reference]: asAnyMarkDefinition(referenceMarkDefinition),
};

/** 内置 mark definition registry（按 type 索引）；内置与自定义 mark 共享同一分派流程。 */
const BUILTIN_MARK_REGISTRY: ReadonlyMap<string, AnyMarkDefinition> = new Map(Object.values(MARK_REGISTRY).map(def => [def.type, def] as const));

/** 内置 mark definition 列表；主要供诊断与测试确认内置覆盖。自定义 definition 不写入此表，而是在每次 lowering 时合并。 */
export const BUILTIN_MARKS: ReadonlyArray<AnyMarkDefinition> = Object.values(MARK_REGISTRY);

/**
 * 解析 mark registry。
 * @description 内置 mark 总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。
 */
export const resolveMarkRegistry = (custom?: ReadonlyArray<AnyMarkDefinition>): Map<string, AnyMarkDefinition> => {
  const registry = new Map<string, AnyMarkDefinition>(BUILTIN_MARK_REGISTRY);
  for (const def of custom ?? []) {
    if (registry.has(def.type)) {
      throw new Error(`lowerPlots: duplicate mark registration: "${def.type}"`);
    }
    registry.set(def.type, def);
  }
  return registry;
};

/** 查找 mark definition；未知 type 必须 fail-loud，避免静默跳过图元下沉。 */
const markDefinitionOf = (mark: MarkOperation, registry: ReadonlyMap<string, AnyMarkDefinition>): AnyMarkDefinition => {
  const def = registry.get(mark.type);
  if (def === undefined) {
    throw new Error(`lowerPlots: mark type "${mark.type}" is not registered; pass a MarkDefinition via options.markDefinitions`);
  }
  return def;
};

export const collectMarkFields = (mark: MarkOperation, fields: FieldCollector, registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY): void => {
  markDefinitionOf(mark, registry).collectFields?.(mark as never, fields);
};

export const channelKindsForMark = (
  mark: MarkOperation,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): ReturnType<NonNullable<AnyMarkDefinition['channelKinds']>> | undefined => markDefinitionOf(mark, registry).channelKinds?.(mark as never);

/**
 * 解析 datum 锚点：cell 类 mark 通过 definition.buildCell 取逻辑 cell，其余内置 mark 走 role 投影。
 * @description registry 层负责查 definition，shared 层只提供纯投影 helper，避免 shared 反向依赖 interval feature。
 */
export const datumAnchor = (
  mark: Mark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx?: IntervalContext,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): [number, number] | null => {
  const definition = markDefinitionOf(mark, registry);
  if (definition.buildCell !== undefined) {
    return cellAnchor(definition.buildCell(mark as never, row, frame, ctx), frame);
  }
  return roleAnchor(mark, row, frame);
};

const isScopeLayer = (layer: IRChild | null): layer is IRScope =>
  layer !== null && layer.type === 'scope' && 'children' in layer;

const applyScopeChannelDeliveries = (layer: IRChild | null, mark: MarkOperation, rows: Array<ExternalRow>, channels: MarkChannels): IRChild | null => {
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
 *   markProvenance 给定（provenance 开）→ 给图层 / series Path / datum Node 绑 id + 来源 meta。
 */
export const lowerMark = (
  mark: MarkOperation,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels = {},
  markProvenance?: MarkProvenance,
  registry: ReadonlyMap<string, AnyMarkDefinition> = BUILTIN_MARK_REGISTRY,
): IRChild | null => applyScopeChannelDeliveries(markDefinitionOf(mark, registry).lower(mark as never, rows, frame, channels, markProvenance), mark, rows, channels);
