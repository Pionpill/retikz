import type { ZodType } from 'zod';

import type { IRJsonObject } from '../../schemas';

type ThemeTokenObject = Readonly<Record<string, unknown>>;

/** 按 owner namespace 绑定 sparse token schema 的运行时定义 */
export type ThemeTokenDefinition<
  TNamespace extends string = string,
  TTokens extends ThemeTokenObject = IRJsonObject,
> = Readonly<{
  /** owner 的非空稳定 namespace */
  namespace: TNamespace;
  /** 校验该 namespace sparse override 的 strict schema */
  schema: ZodType<TTokens>;
}>;

/** 供异构 registry 使用的 Theme token definition 类型擦除形态 */
export type AnyThemeTokenDefinition = ThemeTokenDefinition<string, ThemeTokenObject>;

/** 由 owner authoring helper 产生的纯 JSON token contribution */
export type ThemeTokenContribution<TNamespace extends string, TTokens extends ThemeTokenObject> = Readonly<{
  /** contribution 所属 namespace */
  namespace: TNamespace;
  /** 该 namespace 的 sparse token override */
  tokens: TTokens;
}>;

/** 供通用聚合 helper 使用的 token contribution 类型擦除形态 */
export type AnyThemeTokenContribution = ThemeTokenContribution<string, ThemeTokenObject>;
