import type { AnyCompositeDefinition, AnyThemeTokenDefinition, CompileObservationOwner, IRChild } from '@retikz/core';

/** 嵌入组件可附带的外部数据集表：引用键到任意载荷 */
export type EmbeddableDatasets = Record<string, unknown>;

/**
 * 嵌入贡献内部的领域中立声明位置
 * @description 各位置按贡献节点内部的声明顺序排列，构建器会将它们绑定到贡献节点的来源路径
 */
export type EmbeddableAuthoringSite = Readonly<{
  /** 内部声明位置的类别 */
  kind: 'scope' | 'path' | 'embeddable';
  /** 声明位置对应的可观察所属者；作用域等无所属者的容器可省略 */
  owner?: CompileObservationOwner;
  /** 原始 React 元素类型 */
  elementType: unknown;
  /** 由可选包装组件写入且基础适配器不解释的属性 */
  props: Readonly<Record<string, unknown>>;
}>;

/** 一个可嵌入 Tier2 子组件对图形声明的贡献内容 */
export type EmbeddableContribution = {
  node: IRChild;
  datasets: EmbeddableDatasets;
  /** 贡献节点内部按声明顺序收集的领域中立位置 */
  authoringSites?: ReadonlyArray<EmbeddableAuthoringSite>;
  /** 该 owner 复用的冻结 Theme token definition singleton 列表 */
  themeTokenDefinitions?: ReadonlyArray<AnyThemeTokenDefinition>;
  /** 使用同一 namespace 的贡献必须稳定复用同一个函数引用 */
  makeComposites: (mergedDatasets: EmbeddableDatasets) => Array<AnyCompositeDefinition>;
};

/** 可嵌入 Tier2 适配器，用于让高层领域组件接入 `<Layout>` */
export type EmbeddableTier2Adapter<TProps = Record<string, unknown>> = {
  displayName: string;
  namespace: string;
  contribute: (props: TProps) => EmbeddableContribution;
};

/** 单个可嵌入组件贡献记录，用于后续按命名空间合并数据集 */
export type EmbeddableContributionRecord = {
  namespace: string;
  datasets: EmbeddableDatasets;
  /** 由嵌入 owner 注入、供 Layout 聚合到 Core compile options 的 definition singleton 列表 */
  themeTokenDefinitions?: ReadonlyArray<AnyThemeTokenDefinition>;
  /** 使用同一 namespace 的贡献必须稳定复用同一个函数引用 */
  makeComposites: (mergedDatasets: EmbeddableDatasets) => Array<AnyCompositeDefinition>;
};

/** 组件类型上可读取的可嵌入静态属性形状 */
type MaybeEmbeddableType = {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
  displayName?: string;
  name?: string;
};

/** 把任意类型视作可能带可嵌入静态属性的组件读取 */
const asMaybeEmbeddable = (type: unknown): MaybeEmbeddableType | null => {
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    return type;
  }
  return null;
};

/** 读取组件类型的可嵌入静态标记 */
export const isEmbeddableMarked = (type: unknown): boolean => asMaybeEmbeddable(type)?.isTier2Embeddable === true;

/**
 * 解析一个元素的可嵌入适配器
 * @description 优先用显式 `adapters` 列表按 displayName 匹配；否则读取组件上的可嵌入静态属性。
 *   组件声明自己可嵌入但缺少 adapter 时会抛出带组件名的错误；普通组件返回 null
 */
export const resolveEmbeddableAdapter = (
  type: unknown,
  displayName: string | undefined,
  adapters?: ReadonlyArray<EmbeddableTier2Adapter>,
): EmbeddableTier2Adapter | null => {
  if (adapters && displayName !== undefined) {
    const matched = adapters.find(entry => entry.displayName === displayName);
    if (matched) return matched;
  }

  const candidate = asMaybeEmbeddable(type);
  if (candidate?.isTier2Embeddable === true) {
    const adapter = candidate.embeddableAdapter;
    if (typeof adapter === 'object') return adapter;
    const name = candidate.displayName ?? candidate.name ?? '匿名组件';
    throw new Error(`[retikz] <${name}> 标记了 isTier2Embeddable 但未提供 embeddableAdapter`);
  }

  return null;
};
