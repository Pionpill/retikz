import type { IRPlot, IRPlotScaleOperation } from '@retikz/plot';

import { PlotSchema } from '@retikz/plot';
import { z } from 'zod';

import type { ChartRecipeResolution } from '../contract/recipe';
import type { IRChartPlotExtension, IRChartSource } from '../schemas';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';

const invalidPlot = (message: string, path: ReadonlyArray<string | number>, cause?: unknown): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidResolvedPlot,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

const issuePathOf = (error: z.ZodError): ReadonlyArray<string | number> => {
  const issue = error.issues.at(0);
  const unknownKey = issue?.code === 'unrecognized_keys' ? issue.keys.at(0) : undefined;
  const path = (issue?.path ?? []).map(segment => (typeof segment === 'symbol' ? String(segment) : segment));
  return unknownKey === undefined ? path : [...path, typeof unknownKey === 'symbol' ? String(unknownKey) : unknownKey];
};

const scaleNamesOf = (
  scales: ReadonlyArray<IRPlotScaleOperation>,
  path: ReadonlyArray<string | number>,
): Set<string> => {
  const names = new Set<string>();
  for (const [index, scale] of scales.entries()) {
    if (names.has(scale.name)) throw invalidPlot(`Duplicate Plot scale "${scale.name}"`, [...path, index, 'name']);
    names.add(scale.name);
  }
  return names;
};

/** 按 recipe 的 replaceable 标记组合 Plot scale scaffold 与显式 scales */
export const resolveChartPlotScales = (
  recipe: ChartRecipeResolution,
  extension: IRChartPlotExtension | undefined,
): ReadonlyArray<IRPlotScaleOperation> => {
  const authored = extension?.scales ?? [];
  scaleNamesOf(authored, ['plotExtension', 'scales']);
  const recipeScales = recipe.scaffold.scales.map(({ value }) => value);
  const recipeNames = scaleNamesOf(recipeScales, ['recipe', 'scales']);
  const authoredByName = new Map(authored.map(scale => [scale.name, scale]));

  const scales = recipe.scaffold.scales.map(entry => {
    const authoredScale = authoredByName.get(entry.value.name);
    if (authoredScale === undefined) return entry.value;
    if (!entry.replaceable) {
      throw invalidPlot(`Plot scale "${entry.value.name}" is not replaceable by Chart Source`, [
        'plotExtension',
        'scales',
        authored.findIndex(scale => scale.name === entry.value.name),
      ]);
    }
    return authoredScale;
  });
  const additions = authored.filter(scale => !recipeNames.has(scale.name));
  return [...scales, ...additions];
};

/** 按 recipe 的 spatial replaceable 标记组合 coordinate / composition */
export const resolveChartPlotSpatial = (
  recipe: ChartRecipeResolution,
  extension: IRChartPlotExtension | undefined,
): Pick<IRPlot, 'coordinate' | 'composition'> => {
  const authoredCoordinate = extension?.coordinate;
  const authoredComposition = extension?.composition;
  const authored = authoredCoordinate !== undefined || authoredComposition !== undefined;
  const spatial = recipe.scaffold.spatial;

  if (authored) {
    if (!spatial.replaceable) {
      throw invalidPlot('Recipe spatial scaffold is not replaceable by Chart Source', [
        'plotExtension',
        authoredCoordinate === undefined ? 'composition' : 'coordinate',
      ]);
    }
    return authoredCoordinate === undefined ? { composition: authoredComposition } : { coordinate: authoredCoordinate };
  }

  return 'coordinate' in spatial ? { coordinate: spatial.coordinate } : { composition: spatial.composition };
};

/** 按 recipe 的 guides replaceable 标记组合 guides */
export const resolveChartPlotGuides = (
  recipe: ChartRecipeResolution,
  extension: IRChartPlotExtension | undefined,
): ReadonlyArray<NonNullable<IRPlot['guides']>[number]> | undefined => {
  const authored = extension?.guides;
  const scaffold = recipe.scaffold.guides;
  if (authored === undefined) return scaffold?.value;
  if (scaffold === undefined) return authored;
  if (!scaffold.replaceable) {
    throw invalidPlot('Recipe guides are not replaceable by Chart Source', ['plotExtension', 'guides']);
  }
  return authored;
};

/** 生成并再次通过 PlotSchema 校验唯一完整 Plot IR */
export const resolveChartPlot = (
  source: IRChartSource,
  recipe: ChartRecipeResolution,
  chartMarks: ReadonlyArray<IRPlot['marks'][number]>,
  plotThemeTokens: IRPlot['plotThemeTokens'],
): IRPlot => {
  const extension = source.plotExtension;
  const spatial = resolveChartPlotSpatial(recipe, extension);
  const guides = resolveChartPlotGuides(recipe, extension);
  const scales = resolveChartPlotScales(recipe, extension);
  const marks = [...chartMarks, ...(extension?.marks ?? [])];
  const transforms = [...(extension?.transform ?? []), ...(recipe.scaffold.transform ?? [])];

  const candidate = {
    namespace: 'plot' as const,
    type: 'plot' as const,
    ...(source.id === undefined ? {} : { id: `${source.id}/plot` }),
    data: source.data,
    ...(transforms.length === 0 ? {} : { transform: transforms }),
    scales,
    ...(plotThemeTokens === undefined ? {} : { plotThemeTokens }),
    ...(extension?.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: extension.plotThemeTokenRules }),
    ...(extension?.plotTheme === undefined ? {} : { plotTheme: extension.plotTheme }),
    ...spatial,
    marks,
    ...(guides === undefined ? {} : { guides }),
    ...(extension?.meta === undefined ? {} : { meta: extension.meta }),
  };

  try {
    return PlotSchema.parse(candidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const rebased = new z.ZodError(error.issues.map(issue => ({ ...issue, path: ['plotExtension', ...issue.path] })));
      throw invalidPlot('Resolved Chart Plot does not match PlotSchema', issuePathOf(rebased), rebased);
    }
    throw error;
  }
};
