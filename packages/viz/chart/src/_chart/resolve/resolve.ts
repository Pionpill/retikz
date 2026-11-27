import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import type { ChartSlotConsumption } from '../contract/recipe';
import type { ChartRecipeDefinition } from '../contract/recipe';
import type { IRChartSource } from '../schemas';
import { resolveChartMarks, resolveChartSemanticMarks } from './marks';
import { resolveChartPlot } from './plot';
import { resolveChartPresentation } from './presentation';
import { resolveChartTheme } from './theme';
import type { ChartResolution, SelectedChartResolveContext } from './types';

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
        code: RetikzChartErrorCode.ResolveInputInvalid,
        message: `Chart ${owner} slot "${slot}" has no active consumer`,
        details: { path: ['recipe', owner, slot], slot, owner },
      });
    }
  }
};

/**
 * 解析数据准备与正式编译共用的 Plot 声明
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export const resolveSelectedChartPlot = <TSource extends IRChartSource>(
  source: TSource,
  context: Pick<SelectedChartResolveContext<TSource>, 'recipe' | 'runtime'>,
  defaultPlot?: ChartResolution['theme']['defaultPlot'],
): Pick<ChartResolution, 'plot' | 'warnings'> => {
  const recipe = context.recipe;
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
    defaultPlot,
  );
  return { plot, warnings: semanticMarkResolution.warnings };
};

/** 使用当前位置的主题生成正式 Plot 与 Chart 外观 */
export const resolveSelectedChart = <TSource extends IRChartSource>(
  source: TSource,
  context: SelectedChartResolveContext<TSource>,
): ChartResolution => {
  const theme = resolveChartTheme(source, context);
  const { plot, warnings } = resolveSelectedChartPlot(source, context, theme.defaultPlot);
  const presentation = resolveChartPresentation(source, plot, theme.defaults);

  return { source, theme, plot, warnings, presentation };
};
