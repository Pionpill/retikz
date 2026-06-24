import type { CompositeDefinition, IRChild } from '@retikz/core';

/** 嵌入贡献的外部数据集表：reference 键 → 任意载荷（不进 IR；core 不解释语义） */
export type EmbeddableDatasets = Record<string, unknown>;

/** 一个可嵌入 Tier2 子组件经 adapter 静态贡献的内容 */
export type EmbeddableContribution = {
  node: IRChild;
  datasets: EmbeddableDatasets;
  makeComposites: (mergedDatasets: EmbeddableDatasets) => Array<CompositeDefinition>;
};

/** 可嵌入 Tier2 适配器（domain 提供，core 定接口；core 不 import 任何 domain） */
export type EmbeddableTier2Adapter<TProps = Record<string, unknown>> = {
  displayName: string;
  namespace: string;
  contribute: (props: TProps) => EmbeddableContribution;
};

/** 内部：buildIR 收集的（按 namespace 分组前的）单条贡献记录 */
export type EmbeddableContributionRecord = {
  namespace: string;
  datasets: EmbeddableDatasets;
  makeComposites: (mergedDatasets: EmbeddableDatasets) => Array<CompositeDefinition>;
};

/** 组件 type 上可读取的可嵌入静态属性形状 */
type MaybeEmbeddableType = {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
  displayName?: string;
  name?: string;
};

/** 把任意 type 视作可能带可嵌入静态属性的组件读取 */
const asMaybeEmbeddable = (type: unknown): MaybeEmbeddableType | null => {
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    return type;
  }
  return null;
};

/** 读组件 type 的可嵌入静态标记（Component.isTier2Embeddable === true） */
export const isEmbeddableMarked = (type: unknown): boolean =>
  asMaybeEmbeddable(type)?.isTier2Embeddable === true;

/**
 * 解析一个元素的可嵌入适配器。
 * @description 优先用显式 embeddables 列表按 displayName 匹配（逃生舱 / 测试注入 / 覆盖），
 *   否则读组件静态属性：isTier2Embeddable===true 时返回 embeddableAdapter；
 *   有标记但缺 adapter → fail-loud throw（错误信息带组件名）；都没有 → 返回 null（非可嵌入，调用方按 Sugar 处理）。
 */
export const resolveEmbeddableAdapter = (
  type: unknown,
  displayName: string | undefined,
  embeddables?: ReadonlyArray<EmbeddableTier2Adapter>,
): EmbeddableTier2Adapter | null => {
  if (embeddables && displayName !== undefined) {
    const matched = embeddables.find((entry) => entry.displayName === displayName);
    if (matched) return matched;
  }

  const candidate = asMaybeEmbeddable(type);
  if (candidate?.isTier2Embeddable === true) {
    const adapter = candidate.embeddableAdapter;
    if (typeof adapter === 'object') return adapter;
    const name = candidate.displayName ?? candidate.name ?? '匿名组件';
    throw new Error(
      `[retikz] <${name}> 标记了 isTier2Embeddable 但未提供 embeddableAdapter`,
    );
  }

  return null;
};
