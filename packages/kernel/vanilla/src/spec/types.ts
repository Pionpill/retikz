import type { CompileOptions, CompositeDefinition, IRChild, IRScene, IRViewBox, ValueOf } from '@retikz/core';

import type { VanillaLayerCache } from './constants';

/** Vanilla layer cache hint value. */
export type VanillaLayerCacheValue = ValueOf<typeof VanillaLayerCache>;

/** Vanilla plain spec 中可直接写入 layer / scope 的子节点。 */
export type VanillaChildSpec = IRChild | VanillaEmbedSpec;

/** Vanilla figure plain spec 根节点。 */
export type VanillaFigureSpec = {
  /** Vanilla figure 判别字段。 */
  type: 'figure';
  /** Vanilla spec major version. */
  version: 1;
  /** 可选 figure identity。 */
  id?: string;
  /** 可选显式 viewBox。 */
  viewBox?: IRViewBox;
  /** scene 根时间轴动画 tracks。 */
  animations?: IRScene['animations'];
} & ({ children: Array<VanillaChildSpec>; layers?: never } | { layers: Array<VanillaLayerSpec>; children?: never });

/** Vanilla 分层 authoring 边界。 */
export type VanillaLayerSpec = {
  /** Layer 判别字段。 */
  type: 'layer';
  /** Layer identity，供 runtime metadata / future patch 使用。 */
  id: string;
  /** Runtime cache hint；不进入 core IR。 */
  cache?: VanillaLayerCacheValue;
  /** Layer stack 排序值；缺省按 0 处理，同值保持声明顺序。 */
  zIndex?: number;
  /** Layer 内子节点，按数组顺序绘制。 */
  children: Array<VanillaChildSpec>;
};

/** Vanilla Tier2 嵌入节点。 */
export type VanillaEmbedSpec<TProps = Record<string, unknown>> = {
  /** Embed 判别字段。 */
  type: 'embed';
  /** Adapter 匹配键。 */
  kind: string;
  /** 公开 patch identity。 */
  id: string;
  /** 传给 adapter 的领域 props；不直接进入 core IR。 */
  props: TProps;
};

/** Vanilla Tier2 adapter 的 lower 上下文。 */
export type VanillaEmbedContext = {
  /** 当前 embed identity。 */
  id: string;
  /** 当前 embed kind。 */
  kind: string;
  /** 当前 adapter namespace。 */
  namespace: string;
  /** 所在 layer id。 */
  layerId: string;
  /** 从 layer 到当前节点的 identity path。 */
  identityPath: Array<string>;
};

/** Vanilla Tier2 adapter 对 core compile 的贡献。 */
export type VanillaTier2Contribution = {
  /** 放入 core IR 的 composite / Tier1 子节点。 */
  node: IRChild;
  /** 由 reference key 索引的外部数据集表；不进入 IR。 */
  datasets: Record<string, unknown>;
  /** 合并同 namespace datasets 后生成 composite definitions。 */
  makeComposites: (mergedDatasets: Record<string, unknown>) => Array<CompositeDefinition>;
};

/** Vanilla Tier2 adapter。 */
export type VanillaTier2Adapter<TProps = unknown> = {
  /** `embed(kind, ...)` 的匹配键。 */
  kind: string;
  /** Composite namespace 与 contribution 合并分组键。 */
  namespace: string;
  /** 把 embed props 静态 lower 成 core IR contribution。 */
  lower: (props: TProps, context: VanillaEmbedContext) => VanillaTier2Contribution;
};

/** 擦除 props 类型后的异构 Vanilla Tier2 adapter。 */
export type AnyVanillaTier2Adapter = VanillaTier2Adapter<never>;

/** Vanilla runtime 记录的 layer metadata。 */
export type VanillaLayerMeta = {
  /** Layer identity。 */
  id: string;
  /** Runtime cache hint。 */
  cache: VanillaLayerCacheValue;
  /** 排序后的 layer stack 位置。 */
  order: number;
  /** Layer zIndex，缺省为 0。 */
  zIndex: number;
  /** 该 layer 下直接公开的 child identities。 */
  childIds: Array<string>;
  /** 该 layer 是否包含匿名直接 child；匿名 child 的最小失效边界回退到当前 layer。 */
  hasAnonymousChildren: boolean;
  /** 匿名 child 或无法精确命中 child 时使用的失效边界。 */
  invalidationBoundary: string;
};

/** Vanilla runtime metadata，供后续 patch / invalidate 使用。 */
export type VanillaRuntimeMeta = {
  /** 排序后的 layer metadata。 */
  layers: Array<VanillaLayerMeta>;
  /** 公开 identity 到 identity path 的索引。 */
  identityIndex: ReadonlyMap<string, Array<string>>;
  /** 公开 identity 到父 identity / layer id 的索引。 */
  parentIndex: ReadonlyMap<string, string>;
};

/** Vanilla spec 规范化产物。 */
export type VanillaNormalizedFigure = {
  /** 可交给 core compile 的 IR。 */
  ir: IRScene;
  /** adapter contribution 聚合出的 composite definitions。 */
  composites: Array<CompositeDefinition>;
  /** Runtime metadata，不进入 core IR。 */
  runtimeMeta: VanillaRuntimeMeta;
};

/** Vanilla spec 规范化选项。 */
export type VanillaNormalizeOptions = {
  /** 可嵌入 Tier2 adapter 列表。 */
  adapters?: ReadonlyArray<AnyVanillaTier2Adapter>;
} & Pick<CompileOptions, 'composites'>;
