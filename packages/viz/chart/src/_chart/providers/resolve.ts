import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import type { ChartResolution } from '../resolve';
import { resolveSelectedChart } from '../resolve';
import type { IRChartSource } from '../schemas';
import { chartThemeDefinitionsOf } from './theme';
import type { ChartProviderResolveContext } from './types';

/** 校验 family 并取得当前注册的图表配方 */
export const selectChartRecipe = (
  source: IRChartSource,
  registry: Pick<ChartProviderResolveContext['registry'], 'recipes' | 'family'>,
) => {
  const recipe = registry.recipes.get(source.recipe.chartType);
  if (recipe === undefined) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.ProviderDefinitionUnknown,
      message: `Chart recipe "${source.recipe.chartType}" is not active in this Chart provider`,
      details: { path: ['recipe', 'chartType'], chartType: source.recipe.chartType },
    });
  }

  if (source.type !== registry.family) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.ProviderFamilyMismatch,
      message: `Chart family "${source.type}" does not match provider family "${registry.family}"`,
      details: { path: ['type'], family: source.type, expected: registry.family },
    });
  }

  return recipe;
};

/** 使用选定配方与当前主题解析完整图表 */
export const resolveChartFromProvider = (
  source: IRChartSource,
  context: ChartProviderResolveContext,
): ChartResolution => {
  const { registry } = context;
  const recipe = selectChartRecipe(source, registry);
  return resolveSelectedChart(source, {
    theme: context.theme,
    recipe,
    chartThemeDefinitions: chartThemeDefinitionsOf(context.theme, registry.themes),
    runtime: registry.runtime,
  });
};
