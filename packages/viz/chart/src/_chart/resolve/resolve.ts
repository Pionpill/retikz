import type { IRPlotThemeTokenOverrides } from '@retikz/plot';

import type { ChartSlotConsumption } from '../contract/recipe';
import type { IRChartSource } from '../schemas';
import type { ChartResolution, SelectedChartResolveContext } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { resolveChartMarks, resolveChartSemanticMarks } from './marks';
import { resolveChartPlot } from './plot';
import { resolveChartPresentation } from './presentation';
import { resolveChartTheme } from './theme';

const assertConsumedSlots = (
  source: IRChartSource,
  recipeConsumption: ChartSlotConsumption,
  markConsumption: ChartSlotConsumption,
): void => {
  for (const owner of ['encodings', 'properties'] as const) {
    const consumers = new Set([...recipeConsumption[owner], ...markConsumption[owner]]);
    const values = owner === 'encodings' ? source.recipe.encodings : (source.recipe.properties ?? {});
    for (const slot of Object.keys(values)) {
      if (consumers.has(slot)) continue;
      throw new RetikzChartError({
        code: RetikzChartErrorCode.InvalidChartIR,
        message: `Chart ${owner} slot "${slot}" has no active consumer`,
        details: { path: ['recipe', owner, slot], slot, owner },
      });
    }
  }
};

const plotThemeTokensOf = (
  theme: ReturnType<typeof resolveChartTheme>,
  source: IRChartSource,
): IRPlotThemeTokenOverrides | undefined => {
  const authored = source.plotExtension?.plotThemeTokens;
  if (theme.plot === undefined && authored === undefined) return undefined;
  return { ...(theme.plot ?? {}), ...(authored ?? {}) };
};

/** 将 typed Chart Source 解析为唯一完整 Plot 与固定 presentation 结果 */
export const resolveSelectedChart = (source: IRChartSource, context: SelectedChartResolveContext): ChartResolution => {
  const recipe = context.recipe;
  const theme = resolveChartTheme(source, recipe, context);
  const recipeResolution = recipe.resolve({
    ...(source.id === undefined ? {} : { id: source.id }),
    data: source.data,
    encodings: source.recipe.encodings,
    properties: source.recipe.properties ?? {},
    recipeThemeTokens: theme.recipe,
  });
  if (recipeResolution.semanticMarks.length === 0) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidResolvedPlot,
      message: `Chart recipe "${recipe.chartType}" must produce at least one semantic Plot mark`,
      details: { path: ['recipe', 'chartType'] },
    });
  }

  const markResolution = resolveChartMarks(source, recipe, theme.recipe);
  assertConsumedSlots(source, recipe.consumes, markResolution.consumption);
  const semanticMarkResolution = resolveChartSemanticMarks(recipeResolution, markResolution);
  const plot = resolveChartPlot(
    source,
    recipeResolution,
    semanticMarkResolution.marks,
    plotThemeTokensOf(theme, source),
  );
  const presentation = resolveChartPresentation(source, plot, theme.chart);
  return { source, theme, plot, warnings: semanticMarkResolution.warnings, presentation };
};
