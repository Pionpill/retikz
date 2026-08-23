import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutProvider } from '@retikz/layout';
import { PlotProviderKey } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard';

import type { ChartRecipeDefinition, ChartThemeDefinition } from '../contract';
import type { ChartProviderContribution, ChartRecipeProviderContribution } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { chartProviderKeyOf, createChartDefinition } from './definition';
import { resolveChartProviderRegistry } from './registry';

const ChartRecipeProviderEnvelopeKey = Symbol('retikz.chart.recipeProvider');
const ChartRecipeProviderReferencePrefix = '@@retikz/chart/recipeProvider/';

type ChartRecipeProviderEnvelope = Readonly<{
  [ChartRecipeProviderEnvelopeKey]: ChartRecipeProviderContribution;
}>;

let chartRecipeProviderReferenceSeed = 0;

/** 只识别当前 Chart provider 自己的数据集 envelope */
const recipeContributionOf = (value: unknown): ChartRecipeProviderContribution | undefined => {
  if (value === null || typeof value !== 'object' || !(ChartRecipeProviderEnvelopeKey in value)) return undefined;
  return (value as ChartRecipeProviderEnvelope)[ChartRecipeProviderEnvelopeKey];
};

/** Core 合并后共享的 Chart composite Definition maker；所有 chartType provider 必须引用同一个函数 */
const makeChartDefinition: CoreDependencyProvider['makeDefinition'] = mergedDatasets => {
  const contributions: Array<ChartRecipeProviderContribution> = [];
  for (const value of Object.values(mergedDatasets)) {
    const contribution = recipeContributionOf(value);
    if (contribution !== undefined) contributions.push(contribution);
  }
  const registry = resolveChartProviderRegistry(contributions);
  return createChartDefinition(registry);
};

/** 当前 Chart provider 使用的稳定依赖顺序 */
const chartProviderDependencies = Object.freeze([SurfaceProvider.key, FlexLayoutProvider.key, PlotProviderKey]);

/** 为一个具体 chartType 创建只携带自身 recipe 的 provider contribution */
export const createChartProviderContribution = (
  input: Readonly<{
    /** 当前 provider 所属的稳定 Chart family */
    family: string;
    /** 当前 provider 安装的具体 chartType Definition */
    recipe: ChartRecipeDefinition;
    /** 当前编译边界可见的命名 Theme Definition */
    themeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
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
    recipe: input.recipe,
    themeDefinitions: Object.freeze([...(input.themeDefinitions ?? [])]),
  });
  const runtimeReference = `${ChartRecipeProviderReferencePrefix}${chartRecipeProviderReferenceSeed}`;
  chartRecipeProviderReferenceSeed += 1;
  const provider: CoreDependencyProvider = Object.freeze({
    key: chartProviderKeyOf(input.family),
    dependencies: chartProviderDependencies,
    datasets: Object.freeze({
      [runtimeReference]: Object.freeze({
        [ChartRecipeProviderEnvelopeKey]: contribution,
      } satisfies ChartRecipeProviderEnvelope),
    }),
    makeDefinition: makeChartDefinition,
  });
  return Object.freeze({
    roots: Object.freeze([provider.key]),
    providers: Object.freeze([SurfaceProvider, FlexLayoutProvider, provider]),
  });
};

/** 公开给具体 recipe provider 使用的 Core key 工厂 */
export const chartProviderKeyOfFamily = (family: string): CompositeCoreProviderKey => chartProviderKeyOf(family);
