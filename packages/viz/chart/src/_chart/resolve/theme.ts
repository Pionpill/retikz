import type { ResolvedTheme, ThemeModeValue } from '@retikz/core';
import type { IRPlotThemeTokenOverrides } from '@retikz/plot';

import { ThemeMode } from '@retikz/core';
import { ZodError } from 'zod';

import type { ChartRecipeDefinition } from '../contract/recipe';
import type { ChartThemeDefinition, ChartThemeResolution } from '../contract/theme';
import type { IRChartSource } from '../schemas';
import type { IRChartThemeOverrides, IRChartThemeResolution } from '../schemas/theme';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { ChartThemeToken } from '../constants';
import { ChartThemeResolutionSchema } from '../schemas';

type ChartThemeInput = NonNullable<IRChartSource['theme']>;
type ChartThemeTokens = NonNullable<Exclude<ChartThemeInput, string>['tokens']>;

const chartFallbackOf = (mode: ThemeModeValue): IRChartThemeResolution => {
  const dark = mode === ThemeMode.Dark;
  return ChartThemeResolutionSchema.parse({
    [ChartThemeToken.CanvasFill]: dark ? '#09090B' : '#FFFFFF',
    [ChartThemeToken.Padding]: 16,
    [ChartThemeToken.Gap]: 6,
    [ChartThemeToken.FontFamily]: 'system-ui, Segoe UI, sans-serif',
    [ChartThemeToken.TitleForeground]: dark ? '#FAFAFA' : '#09090B',
    [ChartThemeToken.TitleFontSize]: 18,
    [ChartThemeToken.TitleFontWeight]: 600,
    [ChartThemeToken.TitleLineHeight]: 22,
    [ChartThemeToken.TitleAlign]: 'start',
    [ChartThemeToken.SubtitleForeground]: dark ? '#D4D4D8' : '#3F3F46',
    [ChartThemeToken.SubtitleFontSize]: 13,
    [ChartThemeToken.SubtitleFontWeight]: 400,
    [ChartThemeToken.SubtitleLineHeight]: 18,
    [ChartThemeToken.SubtitleAlign]: 'start',
    [ChartThemeToken.NoteForeground]: dark ? '#A1A1AA' : '#71717A',
    [ChartThemeToken.NoteFontSize]: 11,
    [ChartThemeToken.NoteFontWeight]: 400,
    [ChartThemeToken.NoteLineHeight]: 15,
    [ChartThemeToken.NoteAlign]: 'start',
    [ChartThemeToken.SourceForeground]: dark ? '#A1A1AA' : '#71717A',
    [ChartThemeToken.SourceFontSize]: 11,
    [ChartThemeToken.SourceFontWeight]: 500,
    [ChartThemeToken.SourceLineHeight]: 15,
    [ChartThemeToken.SourceAlign]: 'start',
  });
};

const themeError = (message: string, path: ReadonlyArray<string | number>, cause?: unknown): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidChartIR,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

const mergeRecipeSlice = (
  current: ChartThemeResolution['recipe'],
  override: ChartThemeResolution['recipe'],
): ChartThemeResolution['recipe'] => {
  const merged = structuredClone(current);
  for (const [key, value] of Object.entries(override)) merged[key] = structuredClone(value);
  return merged;
};

const themeTokensOf = (theme: ChartThemeInput): ChartThemeTokens | undefined =>
  typeof theme === 'string' ? undefined : theme.tokens;

const applyThemeDefinition = (
  chart: IRChartThemeOverrides,
  plot: IRPlotThemeTokenOverrides,
  recipeTokens: ChartThemeResolution['recipe'],
  definition: ChartThemeDefinition,
  recipe: ChartRecipeDefinition,
): Readonly<{
  chart: IRChartThemeOverrides;
  plot: IRPlotThemeTokenOverrides;
  recipe: ChartThemeResolution['recipe'];
}> => {
  const tokens = definition.tokens;
  const nextChart = tokens?.chart === undefined ? chart : { ...chart, ...tokens.chart };
  const nextPlot = tokens?.plot === undefined ? plot : { ...plot, ...tokens.plot };
  const recipeOverride = tokens?.recipes?.[recipe.chartType];
  const nextRecipe = recipeOverride === undefined ? recipeTokens : mergeRecipeSlice(recipeTokens, recipeOverride);
  return { chart: nextChart, plot: nextPlot, recipe: nextRecipe };
};

const applyInlineTheme = (
  chart: IRChartThemeOverrides,
  plot: IRPlotThemeTokenOverrides,
  recipeTokens: ChartThemeResolution['recipe'],
  tokens: ChartThemeTokens | undefined,
): Readonly<{
  chart: IRChartThemeOverrides;
  plot: IRPlotThemeTokenOverrides;
  recipe: ChartThemeResolution['recipe'];
}> => {
  if (tokens === undefined) return { chart, plot, recipe: recipeTokens };

  let nextChart = chart;
  if (tokens.chart !== undefined) {
    nextChart = { ...chart, ...tokens.chart };
  }

  let nextRecipe = recipeTokens;
  if (tokens.recipe !== undefined) {
    nextRecipe = mergeRecipeSlice(recipeTokens, tokens.recipe);
  }

  return {
    chart: nextChart,
    plot: tokens.plot === undefined ? plot : { ...plot, ...tokens.plot },
    recipe: nextRecipe,
  };
};

/** 解析 Chart shell、Plot 与当前 recipe 的 Theme owner slices */
export const resolveChartTheme = (
  source: IRChartSource,
  recipe: ChartRecipeDefinition,
  context: Readonly<{
    theme: ResolvedTheme;
    themeDefinitions: ReadonlyArray<ChartThemeDefinition>;
  }>,
): ChartThemeResolution => {
  let chart: IRChartThemeOverrides = chartFallbackOf(context.theme.mode);
  let plot: IRPlotThemeTokenOverrides = {};
  let recipeTokens: ChartThemeResolution['recipe'] = recipe.theme.resolutionSchema.parse(recipe.theme.fallback);
  for (const definition of context.themeDefinitions) {
    const next = applyThemeDefinition(chart, plot, recipeTokens, definition, recipe);
    chart = next.chart;
    plot = next.plot;
    recipeTokens = next.recipe;
  }

  const authoredTheme = source.theme;
  if (authoredTheme !== undefined && typeof authoredTheme !== 'string') {
    const next = applyInlineTheme(chart, plot, recipeTokens, themeTokensOf(authoredTheme));
    chart = next.chart;
    plot = next.plot;
    recipeTokens = next.recipe;
  }

  let resolvedChart: IRChartThemeResolution;
  try {
    resolvedChart = ChartThemeResolutionSchema.parse(chart);
  } catch (error) {
    if (error instanceof ZodError) {
      throw themeError(
        'Chart theme cascade did not produce a complete chart token map',
        ['theme', 'tokens', 'chart'],
        error,
      );
    }
    throw error;
  }

  let resolvedRecipe: ChartThemeResolution['recipe'];
  try {
    resolvedRecipe = recipe.theme.resolutionSchema.parse(recipeTokens);
  } catch (error) {
    if (error instanceof ZodError) {
      throw themeError(
        'Chart theme cascade did not produce a complete recipe token map',
        ['theme', 'tokens', 'recipe'],
        error,
      );
    }
    throw error;
  }

  return {
    chart: resolvedChart,
    ...(Object.keys(plot).length === 0 ? {} : { plot }),
    recipe: resolvedRecipe,
    mode: context.theme.mode,
  };
};
