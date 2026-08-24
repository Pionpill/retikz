import type { CoreProviderContribution, ResolvedTheme } from '@retikz/core';
import type { ZodType } from 'zod';

import type { ChartRecipeDefinition, ChartThemeDefinition } from '../contract';
import type { IRChartSource } from '../schemas';

/** 当前 Core composite contribution 携带的单个 Chart recipe 运行时项 */
export type ChartRecipeProviderContribution = Readonly<{
  /** 当前 provider 所属的稳定 Chart family */
  family: string;
  /** 当前 provider 唯一携带的精确 recipe Definition */
  recipe: ChartRecipeDefinition;
  /** 当前编译边界可见的命名主题 Definition */
  themeDefinitions: ReadonlyArray<ChartThemeDefinition>;
}>;

/** 当前 Core compile 边界实际安装的 Chart recipe registry */
export type ChartProviderRegistry = Readonly<{
  /** 当前 composite key 所属 family */
  family: string;
  /** 当前 active chartType 到 recipe Definition 的索引 */
  recipes: ReadonlyMap<string, ChartRecipeDefinition>;
  /** 当前 active 编译边界可见的命名主题索引 */
  themes: ReadonlyMap<string, ChartThemeDefinition>;
  /** 由 active recipe schema 派生的临时 Source schema */
  schema: ZodType<IRChartSource>;
}>;

/** Chart composite 解析阶段使用的主题上下文 */
export type ChartProviderResolveContext = Readonly<{
  /** Core 当前生效的主题 */
  theme: ResolvedTheme;
  /** 当前 active recipe 与 theme 的临时 registry */
  registry: ChartProviderRegistry;
}>;

/** 具体 chartType factory 交给 Vanilla adapter 的 Chart contribution */
export type ChartProviderContribution = CoreProviderContribution;
