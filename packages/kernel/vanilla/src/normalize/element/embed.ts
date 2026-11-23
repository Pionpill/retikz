import type { CompositeInputBinding, CoreProviderContribution, IRChild } from '@retikz/core';

import type { InputChild } from '../scene';

/** 嵌入贡献内部按声明顺序收集的运行时作者来源 */
export type InputEmbedAuthoringSite = Readonly<{
  /** 内部作者来源的类别 */
  kind: 'scope' | 'path' | 'node' | 'coordinate' | 'embeddable';
  /** 作者来源的稳定类型 */
  type: string;
  /** 由调用方提供且基础归一化不解释的载荷 */
  authoring: unknown;
}>;

/** 嵌入 adapter 在同次 Scene 归一化中处理的子项结果 */
export type EmbedChildrenNormalizationResult = Readonly<{
  /** 相对 children 数组的实例输入；父 adapter 按实际输出字段转交 */
  runtimeInputs?: ReadonlyArray<CompositeInputBinding>;
  /** 已归一为 Core Source IR 的子节点 */
  children: ReadonlyArray<IRChild>;
  /** 子节点按声明顺序产生的 Composite dependency contribution */
  providerDependencies: CoreProviderContribution;
  /** 子节点按声明顺序产生的作者来源 */
  authoringSites: ReadonlyArray<InputEmbedAuthoringSite>;
}>;

/**
 * 作者侧 Tier 2 嵌入输入
 * @template TProps 交给领域 adapter 的已类型化属性，默认使用字符串键记录
 */
export type InputEmbed<TProps = Record<string, unknown>> = Readonly<{
  type: 'embed';
  adapter: AnyInputEmbedAdapter;
  id?: string;
  props: TProps;
  authoring?: unknown;
}> &
  BoundEmbed;

/** 私有名义类型：对象展开或手写字段不能重新配对已验证的实现与 props */
declare class BoundEmbed {
  private readonly boundEmbed: void;
}

/** 已在构造边界完成配对的异构嵌入输入 */
export type AnyInputEmbed = InputEmbed<unknown>;

/** 绑定当前作者位置的 adapter 与 props，不执行领域逻辑 */
export const embed = <TProps>(
  config: Readonly<{
    adapter: InputEmbedAdapter<NoInfer<TProps>>;
    props: TProps;
    id?: string;
    authoring?: unknown;
  }>,
): InputEmbed<TProps> => {
  const node: Pick<InputEmbed<TProps>, 'type' | 'id' | 'authoring' | 'adapter' | 'props'> = {
    ...config,
    type: 'embed',
  };
  // 名义标记只在类型层封闭构造入口
  return Object.freeze(node) as InputEmbed<TProps>;
};

/** Tier 2 adapter 的下沉位置上下文 */
export type InputEmbedContext = {
  /** 当前嵌入节点身份标识 */
  id: string;
  /** 当前嵌入节点类型 */
  kind: string;
  /** 所在分层 id */
  layerId: string;
  /** 从分层到当前节点的身份路径 */
  identityPath: Array<string>;
  /** 在当前根 Scene traversal 中归一化嵌入 slot 的已类型化 authoring 子项 */
  normalizeChildren?: (children: ReadonlyArray<InputChild>) => EmbedChildrenNormalizationResult;
};

/** Tier 2 adapter 对 Source IR 与 Composite resolver 的贡献 */
export type InputEmbedContribution = {
  /** 相对 node 的实例运行时输入，不进入 Source IR */
  runtimeInputs?: ReadonlyArray<CompositeInputBinding>;
  /** 放入 Core Source IR 的 child */
  node: IRChild;
  /** 交由 Vanilla processing 统一消费的 Composite dependency contribution */
  providerDependencies: CoreProviderContribution;
  /** 贡献节点内部按声明顺序收集的运行时作者来源 */
  authoringSites?: ReadonlyArray<InputEmbedAuthoringSite>;
};

/** 将就绪的领域输入下沉为 Core contribution */
export type InputEmbedAdapter<TProps = unknown> = {
  /** 作者类型标识 */
  kind: string;
  /** 同步产生当前实例的节点、依赖与运行时输入 */
  lower: (props: TProps, context: InputEmbedContext) => InputEmbedContribution;
};

/** 擦除领域属性泛型后的异构 adapter */
export type AnyInputEmbedAdapter = InputEmbedAdapter<never>;
