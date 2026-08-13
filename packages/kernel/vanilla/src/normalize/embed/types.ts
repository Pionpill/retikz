import type { CompositeDependencyContribution, IRChild } from '@retikz/core';

/** 作者侧 Tier 2 嵌入输入 */
export type InputEmbed<TProps = Record<string, unknown>> = {
  type: 'embed';
  /** 匹配 Vanilla adapter 的稳定键 */
  kind: string;
  /** 公开更新与诊断使用的身份标识 */
  id: string;
  /** 交给领域 adapter 的已类型化属性 */
  props: TProps;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 擦除领域属性泛型后的嵌入输入 */
export type AnyInputEmbed = InputEmbed<unknown>;

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
};

/** Tier 2 adapter 对 Source IR 与 Composite resolver 的贡献 */
export type InputEmbedContribution = {
  /** 放入 Core Source IR 的 child */
  node: IRChild;
  /** 交由 Vanilla processing 统一消费的 Composite dependency contribution */
  compositeDependencies: CompositeDependencyContribution;
};

/** Tier 2 作者输入到 Core contribution 的适配器 */
export type InputEmbedAdapter<TProps = unknown> = {
  /** `InputEmbed.kind` 的匹配键 */
  kind: string;
  /** 将领域输入静态下沉为 Core contribution */
  lower: (props: TProps, context: InputEmbedContext) => InputEmbedContribution;
};

/** 擦除领域属性泛型后的异构 adapter */
export type AnyInputEmbedAdapter = InputEmbedAdapter<never>;
