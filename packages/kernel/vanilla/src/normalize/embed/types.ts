import type {
  CompileObservationOwner,
  CoreProviderContribution,
  IRChild,
  IRTheme,
  ResolvedTheme,
  ThemeStyleDefinition,
} from '@retikz/core';

import type { InputChild } from '../scene';

/** 嵌入贡献内部按声明顺序收集的运行时作者来源 */
export type InputEmbedAuthoringSite = Readonly<{
  /** 内部作者来源的类别 */
  kind: 'scope' | 'path' | 'embeddable';
  /** 对应的 Core 编译观察所属者 */
  owner?: CompileObservationOwner;
  /** 作者来源的稳定类型 */
  type: string;
  /** 由调用方提供且基础归一化不解释的载荷 */
  authoring: unknown;
}>;

/** 嵌入 adapter 在同次 Scene 归一化中处理的子项结果 */
export type NormalizedInputEmbedChildren = Readonly<{
  /** 已归一为 Core Source IR 的子节点 */
  children: ReadonlyArray<IRChild>;
  /** 子节点按声明顺序产生的 Composite dependency contribution */
  providerDependencies: CoreProviderContribution;
  /** 子节点按声明顺序产生的作者来源 */
  authoringSites: ReadonlyArray<InputEmbedAuthoringSite>;
}>;

/** InputEmbed 所在位置已生效的 Core Theme 上下文 */
export type InputEmbedThemeContext = Readonly<{
  /** Scene / Scope 链解析后的有效 Theme */
  theme: ResolvedTheme;
  /** 调用方提供的 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** processing 注入给 InputScene normalizer 的 Scope Theme 解析器 */
export type InputEmbedThemeContextResolver = Readonly<{
  /** Scene 根的有效 Theme 上下文 */
  root: InputEmbedThemeContext;
  /** 为嵌套 Scope 解析下一级有效 Theme 上下文 */
  resolveScope: (
    parent: InputEmbedThemeContext,
    theme: IRTheme | undefined,
    sourcePath: string,
  ) => InputEmbedThemeContext;
}>;

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
  /** processing 已准备的有效 Theme */
  theme?: ResolvedTheme;
  /** processing 传递的 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  /** 在当前根 Scene traversal 中归一化嵌入 slot 的已类型化 authoring 子项 */
  normalizeChildren?: (children: ReadonlyArray<InputChild>) => NormalizedInputEmbedChildren;
};

/** Tier 2 adapter 对 Source IR 与 Composite resolver 的贡献 */
export type InputEmbedContribution = {
  /** 放入 Core Source IR 的 child */
  node: IRChild;
  /** 交由 Vanilla processing 统一消费的 Composite dependency contribution */
  providerDependencies: CoreProviderContribution;
  /** 贡献节点内部按声明顺序收集的运行时作者来源 */
  authoringSites?: ReadonlyArray<InputEmbedAuthoringSite>;
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
