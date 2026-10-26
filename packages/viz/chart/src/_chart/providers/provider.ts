import type { CoreDependencyProvider, CoreProviderContribution, ResolvedTheme } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import type { LowerPlotsOptions, PlotDataPreparationOptions } from '@retikz/plot';
import { PlotProviderKey, preparePlotData } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard/presentation';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import type { ChartRecipeDefinition, ChartThemeDefinition } from '../contract';
import { eraseChartRecipeDefinition } from '../contract';
import type { IRChartSource } from '../schemas';
import { chartProviderKeyOf, createChartDefinition } from './composite';
import { resolveChartProviderRegistry } from './registry';
import { resolveChartFromProvider } from './resolve';
import type { ChartProviderContribution, ChartRecipeProviderContribution } from './types';

/** 从同键的 recipe 参数物化 Chart family 定义 */
const makeChartDefinition: CoreDependencyProvider<ChartRecipeProviderContribution>['makeDefinition'] = contributions =>
  createChartDefinition(resolveChartProviderRegistry(contributions));

/** 当前 Chart provider 使用的稳定依赖顺序 */
const chartProviderDependencies = Object.freeze([SurfaceProvider.key, FlexLayoutProvider.key, PlotProviderKey]);

/**
 * 为一个具体 chartType 创建只携带自身 recipe 的 provider contribution
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export const createChartProviderContribution = <TSource extends IRChartSource>(
  input: Readonly<{
    /** 当前 provider 所属的稳定 Chart family */
    family: string;
    /** 当前 provider 安装的具体 chartType Definition */
    recipe: ChartRecipeDefinition<TSource>;
    /** 当前编译边界可见的命名 Theme Definition */
    chartThemeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
    /** 与Plot provider共享的lowering runtime Definition */
    lowerOptions?: LowerPlotsOptions;
  }>,
): ChartProviderContribution => {
  if (input.family.length === 0) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidRegistry,
      message: 'Chart provider family must be non-empty',
      details: { path: ['family'] },
    });
  }

  const contribution: ChartRecipeProviderContribution = Object.freeze({
    family: input.family,
    recipe: eraseChartRecipeDefinition(input.recipe),
    chartThemeDefinitions: Object.freeze([...(input.chartThemeDefinitions ?? [])]),
    runtimeDefinitions: Object.freeze({
      ...(input.lowerOptions?.definitions?.coordinates === undefined
        ? {}
        : { coordinates: input.lowerOptions.definitions.coordinates }),
      ...(input.lowerOptions?.definitions?.transforms === undefined
        ? {}
        : { transforms: input.lowerOptions.definitions.transforms }),
      ...(input.lowerOptions?.definitions?.statisticsReducers === undefined
        ? {}
        : { statisticsReducers: input.lowerOptions.definitions.statisticsReducers }),
      ...(input.lowerOptions?.definitions?.regressions === undefined
        ? {}
        : { regressions: input.lowerOptions.definitions.regressions }),
      ...(input.lowerOptions?.definitions?.rowSelectors === undefined
        ? {}
        : { rowSelectors: input.lowerOptions.definitions.rowSelectors }),
      ...(input.lowerOptions?.definitions?.scales === undefined
        ? {}
        : { scales: input.lowerOptions.definitions.scales }),
    }),
  });

  const provider: CoreDependencyProvider<ChartRecipeProviderContribution> = Object.freeze({
    key: chartProviderKeyOf(input.family),
    dependencies: chartProviderDependencies,
    params: contribution,
    makeDefinition: makeChartDefinition,
  });

  return Object.freeze({
    roots: Object.freeze([provider.key]),
    providers: Object.freeze([SurfaceProvider, FlexLayoutProvider, provider]),
  });
};

/**
 * 复用具体 Chart provider 的精确语义与 Theme，先准备生成 Plot 的全部数据作用域
 * @template TSource 数据执行器消费的原生源句柄类型，默认 never 表示不接入原生源
 */
export const prepareChartData = async <TSource = never>(
  source: IRChartSource,
  request: PlotDataPreparationOptions<TSource>,
  contribution: CoreProviderContribution,
  theme: ResolvedTheme = DEFAULT_RESOLVED_THEME,
  lowerOptions: LowerPlotsOptions = {},
) => {
  const contributions: Array<ChartRecipeProviderContribution> = [];

  for (const provider of contribution.providers) {
    if (provider.makeDefinition === makeChartDefinition && provider.params !== undefined) {
      // 工厂身份关联其精确参数类型，避免通过参数结构识别其它 owner 的提供者
      contributions.push(provider.params as ChartRecipeProviderContribution);
    }
  }

  const registry = resolveChartProviderRegistry(contributions);
  const parsed = registry.schema.parse(source);
  const resolution = resolveChartFromProvider(parsed, { registry, theme });

  return preparePlotData(resolution.plot, request, lowerOptions);
};
