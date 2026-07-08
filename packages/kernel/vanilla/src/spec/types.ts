import type { CompileOptions, CompositeDefinition, IRChild, IRScene, IRViewBox, ValueOf } from '@retikz/core';

import type { VanillaLayerCache } from './constants';

/** Vanilla 分层缓存提示取值。 */
export type VanillaLayerCacheValue = ValueOf<typeof VanillaLayerCache>;

/** Vanilla 普通规格中可直接写入分层或作用域的子节点。 */
export type VanillaChildSpec = IRChild | VanillaEmbedSpec;

/** Vanilla 普通规格的图形根节点。 */
export type VanillaFigureSpec = {
  /** 图形判别字段。 */
  type: 'figure';
  /** 规格主版本号。 */
  version: 1;
  /** 可选图形身份标识。 */
  id?: string;
  /** 可选显式视口。 */
  viewBox?: IRViewBox;
  /** 场景根时间轴动画轨道。 */
  animations?: IRScene['animations'];
} & ({ children: Array<VanillaChildSpec>; layers?: never } | { layers: Array<VanillaLayerSpec>; children?: never });

/** Vanilla 分层作者边界。 */
export type VanillaLayerSpec = {
  /** 分层判别字段。 */
  type: 'layer';
  /** 分层身份标识，供运行时元数据与后续补丁使用。 */
  id: string;
  /** 运行时缓存提示；不进入核心 IR。 */
  cache?: VanillaLayerCacheValue;
  /** 分层栈排序值；缺省按 0 处理，同值保持声明顺序。 */
  zIndex?: number;
  /** 分层内子节点，按数组顺序绘制。 */
  children: Array<VanillaChildSpec>;
};

/** Vanilla Tier2 嵌入节点。 */
export type VanillaEmbedSpec<TProps = Record<string, unknown>> = {
  /** 嵌入节点判别字段。 */
  type: 'embed';
  /** 适配器匹配键。 */
  kind: string;
  /** 公开补丁身份标识。 */
  id: string;
  /** 传给适配器的领域属性；不直接进入核心 IR。 */
  props: TProps;
};

/** Vanilla Tier2 适配器的下沉上下文。 */
export type VanillaEmbedContext = {
  /** 当前嵌入节点身份标识。 */
  id: string;
  /** 当前嵌入节点类型。 */
  kind: string;
  /** 当前适配器命名空间。 */
  namespace: string;
  /** 所在分层 id。 */
  layerId: string;
  /** 从分层到当前节点的身份路径。 */
  identityPath: Array<string>;
};

/** Vanilla Tier2 适配器对核心编译的贡献。 */
export type VanillaTier2Contribution = {
  /** 放入核心 IR 的组合定义或 Tier1 子节点。 */
  node: IRChild;
  /** 由引用键索引的外部数据集表；不进入 IR。 */
  datasets: Record<string, unknown>;
  /** 合并同命名空间数据集后生成组合定义。 */
  makeComposites: (mergedDatasets: Record<string, unknown>) => Array<CompositeDefinition>;
};

/** Vanilla Tier2 适配器。 */
export type VanillaTier2Adapter<TProps = unknown> = {
  /** `embed(kind, ...)` 的匹配键。 */
  kind: string;
  /** 组合定义命名空间，也是贡献合并分组键。 */
  namespace: string;
  /** 把嵌入节点属性静态下沉成核心 IR 贡献。 */
  lower: (props: TProps, context: VanillaEmbedContext) => VanillaTier2Contribution;
};

/** 擦除属性类型后的异构 Vanilla Tier2 适配器。 */
export type AnyVanillaTier2Adapter = VanillaTier2Adapter<never>;

/** Vanilla 运行时记录的分层元数据。 */
export type VanillaLayerMeta = {
  /** 分层身份标识。 */
  id: string;
  /** 运行时缓存提示。 */
  cache: VanillaLayerCacheValue;
  /** 排序后的分层栈位置。 */
  order: number;
  /** 分层 zIndex，缺省为 0。 */
  zIndex: number;
  /** 该分层下直接公开的子节点身份标识列表。 */
  childIds: Array<string>;
  /** 该分层是否包含匿名直接子节点；匿名子节点的最小失效边界回退到当前分层。 */
  hasAnonymousChildren: boolean;
  /** 匿名子节点或无法精确命中子节点时使用的失效边界。 */
  invalidationBoundary: string;
};

/** Vanilla 运行时元数据，供后续补丁和失效标记使用。 */
export type VanillaRuntimeMeta = {
  /** 排序后的分层元数据。 */
  layers: Array<VanillaLayerMeta>;
  /** 公开身份标识到身份路径的索引。 */
  identityIndex: ReadonlyMap<string, Array<string>>;
  /** 公开身份标识到父身份标识或分层 id 的索引。 */
  parentIndex: ReadonlyMap<string, string>;
};

/** Vanilla 规格规范化产物。 */
export type VanillaNormalizedFigure = {
  /** 可交给核心编译的 IR。 */
  ir: IRScene;
  /** 适配器贡献聚合出的组合定义。 */
  composites: Array<CompositeDefinition>;
  /** 运行时元数据，不进入核心 IR。 */
  runtimeMeta: VanillaRuntimeMeta;
};

/** Vanilla 规格规范化选项。 */
export type VanillaNormalizeOptions = {
  /** 可嵌入 Tier2 适配器列表。 */
  adapters?: ReadonlyArray<AnyVanillaTier2Adapter>;
} & Pick<CompileOptions, 'composites'>;
