import type { ChartSlotConsumption } from '../contract/recipe';
import type { ChartRecipeDefinition } from '../contract/recipe';
import type { IRChartSource } from '../schemas';
import type { ChartResolution, SelectedChartResolveContext } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { resolveChartMarks, resolveChartSemanticMarks } from './marks';
import { resolveChartPlot } from './plot';
import { resolveChartPresentation } from './presentation';
import { resolveChartTheme } from './theme';

const assertConsumedSlots = (
  source: IRChartSource,
  recipe: Pick<ChartRecipeDefinition, 'chartType' | 'consumes'>,
  markConsumption: ChartSlotConsumption,
): void => {
  for (const owner of ['encodings', 'properties'] as const) {
    const consumers = new Set([...recipe.consumes[owner], ...markConsumption[owner]]);
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

/** 将 typed Chart Source 解析为唯一完整 Plot 与固定 presentation 结果 */
export const resolveSelectedChart = <TSource extends IRChartSource>(
  source: TSource,
  context: SelectedChartResolveContext<TSource>,
): ChartResolution => {
  const recipe = context.recipe;
  const theme = resolveChartTheme(source, context);
  const encodingResolution = recipe.resolveEncodings({
    source,
    encodings: source.recipe.encodings,
    runtime: context.runtime,
  });
  const recipeResolution = recipe.resolve({
    ...(source.id === undefined ? {} : { id: source.id }),
    data: source.data,
    encodings: encodingResolution.encodings,
    properties: source.recipe.properties ?? {},
  });
  if (recipeResolution.semanticMarks.length === 0) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidResolvedPlot,
      message: `Chart recipe "${recipe.chartType}" must produce at least one semantic Plot mark`,
      details: { path: ['recipe', 'chartType'] },
    });
  }

  const markResolution = resolveChartMarks(source, recipe, encodingResolution.encodings);
  assertConsumedSlots(source, recipe, markResolution.consumption);
  const semanticMarkResolution = resolveChartSemanticMarks(recipeResolution, markResolution);
  const plot = resolveChartPlot(
    source,
    recipe,
    recipeResolution,
    encodingResolution,
    semanticMarkResolution.marks,
    context.runtime,
    theme.plotDefaults,
  );
  const presentation = resolveChartPresentation(source, plot, theme.defaults);
  return { source, theme, plot, warnings: semanticMarkResolution.warnings, presentation };
};
