import type { CoreProviderContribution, ResolvedTheme } from '@retikz/core';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { ZodType } from 'zod';

import type {
  AnyChartRecipeDefinition,
  ChartEncodingRuntime,
  ChartRecipeDefinition,
  ChartThemeDefinition,
} from '../contract';
import type { IRChartSource } from '../schemas';

/** 当前 Core composite contribution 携带的单个 Chart recipe 运行时项 */
export type ChartRecipeProviderContribution = Readonly<{
  /** 当前 provider 所属的稳定 Chart family */
  family: string;
  /** 当前 provider 唯一携带的泛型已擦除 recipe Definition */
  recipe: AnyChartRecipeDefinition;
  /** 当前编译边界可见的命名主题 Definition */
  themeDefinitions: ReadonlyArray<ChartThemeDefinition>;
  /** 与同次Plot lowering共享的runtime Definition数组 */
  runtimeDefinitions?: ChartRuntimeDefinitionOptions;
}>;

/** registry 入口接收的精确 Chart recipe contribution */
export type ChartRecipeProviderContributionInput<TSource extends IRChartSource> = Omit<
  ChartRecipeProviderContribution,
  'recipe'
> &
  Readonly<{
    recipe: ChartRecipeDefinition<TSource>;
  }>;

/** Chart encoding resolve需要与Plot共享的runtime Definition输入 */
export type ChartRuntimeDefinitionOptions = Readonly<
  Pick<
    LowerPlotsOptions,
    'transformDefinitions' | 'statisticsReducerDefinitions' | 'rowSelectorDefinitions' | 'scaleDefinitions'
  >
>;

/** 当前 Core compile 边界实际安装的 Chart recipe registry */
export type ChartProviderRegistry = Readonly<{
  /** 当前 composite key 所属 family */
  family: string;
  /** 当前 active chartType 到 recipe Definition 的索引 */
  recipes: ReadonlyMap<string, AnyChartRecipeDefinition>;
  /** 当前 active 编译边界可见的命名主题索引 */
  themes: ReadonlyMap<string, ChartThemeDefinition>;
  /** 由 active recipe schema 派生的临时 Source schema */
  schema: ZodType<IRChartSource>;
  /** 当前active compile边界解析后的owner Definition注册表 */
  runtime: ChartEncodingRuntime;
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
