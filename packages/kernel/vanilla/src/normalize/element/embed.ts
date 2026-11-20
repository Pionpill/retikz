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

/** Tier 2 作者输入到 Core contribution 的适配器 */
export type InputEmbedPreparation = Readonly<{
  /** 单次执行，完成领域计算并产生同步贡献 */
  execute: () => InputEmbedContribution | Promise<InputEmbedContribution>;
}>;

/** 嵌套作者输入的独立执行权 */
export type InputEmbedChildrenPreparation = Readonly<{
  /** 按作者顺序消费已准备的子项 */
  execute: () => EmbedChildrenNormalizationResult | Promise<EmbedChildrenNormalizationResult>;
}>;

/** 共享 processing 提供的作者位置与失效信号 */
export type InputEmbedPreparationContext = Readonly<Omit<InputEmbedContext, 'normalizeChildren'>> &
  Readonly<{
    /** 当前请求取消或被替代时终止 */
    signal: AbortSignal;
    /** 只在准备期间登记作者子项，不在执行时发现新依赖 */
    prepareChildren: (children: ReadonlyArray<InputChild>) => Promise<InputEmbedChildrenPreparation>;
  }>;

/**
 * 同步入口只接受具有明确 lower 能力的 adapter
 * @template TProps lower 与可选 prepare 共同接受的领域属性类型
 */
export type SynchronousInputEmbedAdapter<TProps = unknown> = {
  /** `adapter.kind` 标识作者类型 */
  kind: string;
  /** 将领域输入静态下沉为 Core contribution */
  lower: (props: TProps, context: InputEmbedContext) => InputEmbedContribution;
  /** 异步作者入口的能力准备，不执行领域计算 */
  prepare?: (
    props: TProps,
    context: InputEmbedPreparationContext,
  ) => InputEmbedPreparation | Promise<InputEmbedPreparation>;
};

/**
 * 同一 kind 的同步与异步作者能力
 * @template TProps adapter 的同步下沉或异步准备入口接受的领域属性类型
 */
export type InputEmbedAdapter<TProps = unknown> =
  | SynchronousInputEmbedAdapter<TProps>
  | Readonly<{
      /** 作者类型标识 */
      kind: string;
      /** 全树能力准备 */
      prepare: (
        props: TProps,
        context: InputEmbedPreparationContext,
      ) => InputEmbedPreparation | Promise<InputEmbedPreparation>;
      /** 仅异步 adapter 不具有同步入口 */
      lower?: never;
    }>;

/** 擦除领域属性泛型后的异构 adapter */
export type AnyInputEmbedAdapter = InputEmbedAdapter<never>;
