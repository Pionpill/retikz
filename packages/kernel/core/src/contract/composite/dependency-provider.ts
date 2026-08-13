import type { AnyCompositeDefinition } from './types';

/** Composite provider 的完整 namespace/type identity */
export type CompositeProviderKey = Readonly<{
  /** Composite owner namespace */
  namespace: string;
  /** Composite owner-local type */
  type: string;
}>;

/** 单个 Composite definition 及其传递依赖与运行时数据提供者 */
export type CompositeDependencyProvider = Readonly<{
  /** 此 provider 唯一生成的 Composite key */
  key: CompositeProviderKey;
  /** 此 definition 需要的有序直接依赖 */
  dependencies: ReadonlyArray<CompositeProviderKey>;
  /** 同 key 多个 authored instance 需要合并的运行时数据 */
  datasets: Readonly<Record<string, unknown>>;
  /** 使用当前 key 的完整合并数据创建唯一 definition */
  makeDefinition: (mergedDatasets: Readonly<Record<string, unknown>>) => AnyCompositeDefinition;
}>;

/** 一次 authoring contribution 要求的根能力与可用 provider catalog */
export type CompositeDependencyContribution = Readonly<{
  /** 当前 authored node 实际要求的有序根 key */
  roots: ReadonlyArray<CompositeProviderKey>;
  /** 此 contribution 显式携带的 providers */
  providers: ReadonlyArray<CompositeDependencyProvider>;
}>;

/** Composite provider graph 的纯解析输入 */
export type ResolveCompositeDependenciesOptions = Readonly<{
  /** 所有 adapter-neutral authored contributions */
  contributions: ReadonlyArray<CompositeDependencyContribution>;
  /** provider definitions 之后追加的最终显式 definitions */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;
