import type { IRPlot, IRPlotCoordinateOperation, IRPlotScaleOperation } from '@retikz/plot';

import { PlotSchema, resolvePlotFacetComposition } from '@retikz/plot';
import { ZodError } from 'zod';

import type { ChartEncodingResolution, ChartRecipeResolution } from '../contract/recipe';
import type { IRChartPlotExtension, IRChartSource } from '../schemas';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';

const invalidPlot = (message: string, path: ReadonlyArray<string | number>, cause?: unknown): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidResolvedPlot,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

const issuePathOf = (error: ZodError): ReadonlyArray<string | number> => {
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
  encodings: ChartEncodingResolution,
  extension: IRChartPlotExtension | undefined,
): ReadonlyArray<IRPlotScaleOperation> => {
  const authored = extension?.scales ?? [];
  scaleNamesOf(authored, ['plotExtension', 'scales']);
  const recipeEntries = recipe.scaffold.scales.filter(entry => !encodings.removedRecipeScales.has(entry.value.name));
  const recipeScales = recipeEntries.map(({ value }) => value);
  const recipeNames = scaleNamesOf(recipeScales, ['recipe', 'scales']);
  const authoredByName = new Map(authored.map(scale => [scale.name, scale]));

  const scales = recipeEntries.map(entry => {
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
  const encodingNames = scaleNamesOf(encodings.scales, ['recipe', 'encodings']);
  const additions = authored.filter(scale => !recipeNames.has(scale.name) && !encodingNames.has(scale.name));
  return [...scales, ...encodings.scales, ...additions];
};

const withPositionScales = (
  coordinate: IRPlotCoordinateOperation,
  encodings: ChartEncodingResolution,
): IRPlotCoordinateOperation => ({ ...coordinate, ...encodings.positionScales });

/** 按 recipe 的 spatial replaceable 标记组合 coordinate / composition */
export const resolveChartPlotSpatial = (
  recipe: ChartRecipeResolution,
  encodings: ChartEncodingResolution,
  extension: IRChartPlotExtension | undefined,
): Pick<IRPlot, 'coordinate' | 'composition'> => {
  const authoredCoordinate = extension?.coordinate;
  const authoredComposition = extension?.composition;
  const authored = authoredCoordinate !== undefined || authoredComposition !== undefined;
  const spatial = recipe.scaffold.spatial;

  if (encodings.spatial !== undefined) {
    if (authored) {
      throw invalidPlot('Chart composition encoding cannot be combined with a Plot spatial extension', [
        'plotExtension',
        authoredCoordinate === undefined ? 'composition' : 'coordinate',
      ]);
    }
    if ('composition' in spatial) {
      throw invalidPlot('Chart composition encoding requires a single recipe coordinate scaffold', [
        'recipe',
        'encodings',
        encodings.spatial.kind,
      ]);
    }
    const coordinate = withPositionScales(spatial.coordinate, encodings);
    return {
      composition: resolvePlotFacetComposition(
        {
          id: encodings.spatial.id,
          ...(encodings.spatial.row === undefined ? {} : { row: encodings.spatial.row }),
          ...(encodings.spatial.column === undefined ? {} : { column: encodings.spatial.column }),
          ...encodings.spatial.options,
        },
        { coordinate, templateViewId: encodings.spatial.view },
      ),
    };
  }

  if (authored) {
    if (!spatial.replaceable) {
      throw invalidPlot('Recipe spatial scaffold is not replaceable by Chart Source', [
        'plotExtension',
        authoredCoordinate === undefined ? 'composition' : 'coordinate',
      ]);
    }
    if (authoredCoordinate === undefined) {
      if (Object.keys(encodings.positionScales).length > 0) {
        throw invalidPlot('Chart position scale encoding requires a coordinate spatial source', [
          'plotExtension',
          'composition',
        ]);
      }
      return { composition: authoredComposition };
    }
    return { coordinate: withPositionScales(authoredCoordinate, encodings) };
  }

  if ('coordinate' in spatial) return { coordinate: withPositionScales(spatial.coordinate, encodings) };
  if (Object.keys(encodings.positionScales).length > 0) {
    throw invalidPlot('Chart position scale encoding cannot target a recipe composition scaffold', [
      'recipe',
      'encodings',
    ]);
  }
  return { composition: spatial.composition };
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
  encodings: ChartEncodingResolution,
  chartMarks: ReadonlyArray<IRPlot['marks'][number]>,
  plotThemeTokens: IRPlot['plotThemeTokens'],
): IRPlot => {
  const extension = source.plotExtension;
  const spatial = resolveChartPlotSpatial(recipe, encodings, extension);
  const guides = resolveChartPlotGuides(recipe, extension);
  const scales = resolveChartPlotScales(recipe, encodings, extension);
  const marks = [...chartMarks, ...(extension?.marks ?? [])];
  const transforms = [...(extension?.transform ?? []), ...encodings.transform, ...(recipe.scaffold.transform ?? [])];

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
    if (error instanceof ZodError) {
      const plotPath = issuePathOf(error);
      const sourcePath =
        encodings.spatial !== undefined && plotPath[0] === 'composition'
          ? [
              'recipe',
              'encodings',
              encodings.spatial.kind,
              ...(plotPath[1] === 'arrangements' && plotPath[2] === 0 ? plotPath.slice(3) : []),
            ]
          : ['plotExtension', ...plotPath];
      const rebased = new ZodError(error.issues.map(issue => ({ ...issue, path: sourcePath })));
      throw invalidPlot('Resolved Chart Plot does not match PlotSchema', sourcePath, rebased);
    }
    throw error;
  }
};
