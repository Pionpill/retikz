import type { ChartResolution } from '../resolve';
import type { IRChartSource } from '../schemas';
import type { ChartProviderResolveContext } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { resolveSelectedChart } from '../resolve';
import { chartThemeDefinitionsOf } from './theme';

/** 从 active provider registry 选择 recipe 并委托 Chart resolver 完成解析 */
export const resolveChartFromProvider = (
  source: IRChartSource,
  context: ChartProviderResolveContext,
): ChartResolution => {
  const recipe = context.registry.recipes.get(source.recipe.chartType);
  if (recipe === undefined) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.UnknownDefinition,
      message: `Chart recipe "${source.recipe.chartType}" is not active in this Chart provider`,
      details: { path: ['recipe', 'chartType'], chartType: source.recipe.chartType },
    });
  }
  if (source.type !== context.registry.family) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.FamilyMismatch,
      message: `Chart family "${source.type}" does not match provider family "${context.registry.family}"`,
      details: { path: ['type'], family: source.type, expected: context.registry.family },
    });
  }
  return resolveSelectedChart(source, {
    theme: context.theme,
    recipe,
    themeDefinitions: chartThemeDefinitionsOf(source, context.theme, context.registry.themes),
    runtime: context.registry.runtime,
  });
};
