import type { IRChild, ResolvedTheme } from '@retikz/core';
import type { IRPlotSpec, PlotThemeStyleDefinition } from '@retikz/plot';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import { PlotSpecSchema, resolvePlotTheme } from '@retikz/plot';
import { z } from 'zod';

import type { InternalChartSpecBound } from '../families/shared';
import type { IRChartInspection } from '../inspection';
import type { ChartThemeStyleDefinition } from '../style';

import { ChartRecipeInvariantError } from '../families/shared';
import { createChartInspection } from '../inspection';
import { resolveChartPresentation } from '../presentation';
import { CHART_NAMESPACE } from '../schemas';
import { chartRecipeStyleContextOf, resolveChartStyle } from '../style';
import { BUILTIN_CHART_RECIPES } from './catalog';
import { ChartResolveError, ChartResolveErrorCode } from './errors';
import { chartInspectionMemberInputsOf, ChartMemberParseError, mergeChartSeed } from './merge';

/** Chart resolver 的内部成功结果 */
export type ChartResolution = {
  /** merge 与最终 parse 后的 PlotSpec */
  plotSpec: IRPlotSpec;
  /** 供 Core composite 递归消费的 PlotSpec 或 Scope */
  node: IRChild;
  /** 与最终 Plot member 对齐的 resolution inspection */
  inspection: IRChartInspection;
};

const DispatchEnvelopeSchema = z
  .looseObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.string().min(1).describe('Closed Chart type discriminator'),
  })
  .describe('Minimal envelope used to dispatch a Chart input to its closed recipe');

/** Chart resolver 与 composite runtime-only style definition 选项 */
export type ChartResolveOptions = Readonly<{
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
}>;

const DEFAULT_RESOLVED_THEME: ResolvedTheme = {
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
  colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
};

/** 把首个 Zod issue 归一为稳定且可定位的 Chart error path */
const issuePathOf = (error: z.ZodError): ReadonlyArray<string | number> => {
  const issue = error.issues.at(0);
  const path = (issue?.path ?? []).map(part => (typeof part === 'symbol' ? String(part) : part));
  const unrecognizedKey = issue?.code === 'unrecognized_keys' ? issue.keys.at(0) : undefined;
  return unrecognizedKey === undefined ? path : [...path, unrecognizedKey];
};

/** 把 schema failure 转换为统一的 Chart resolver error */
const invalidSchemaError = (
  code: typeof ChartResolveErrorCode.InvalidChartSpec | typeof ChartResolveErrorCode.InvalidResolvedPlot,
  error: z.ZodError,
  cause: unknown = error,
): ChartResolveError => new ChartResolveError(code, { path: issuePathOf(error), cause });

/** 通过封闭 recipe tuple 解析一个私有 Chart spec */
export const resolveChartSpec = (
  input: unknown,
  effectiveTheme: ResolvedTheme = DEFAULT_RESOLVED_THEME,
  options: ChartResolveOptions = {},
): ChartResolution => {
  let envelope: z.infer<typeof DispatchEnvelopeSchema>;
  try {
    envelope = DispatchEnvelopeSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) throw invalidSchemaError(ChartResolveErrorCode.InvalidChartSpec, error);
    throw error;
  }

  const recipe = BUILTIN_CHART_RECIPES.find(candidate => candidate.type === envelope.type);
  if (recipe === undefined) {
    throw new ChartResolveError(ChartResolveErrorCode.UnknownType, { path: ['type'] });
  }

  let bound;
  try {
    bound = recipe.bind(input);
  } catch (error) {
    if (error instanceof z.ZodError) throw invalidSchemaError(ChartResolveErrorCode.InvalidChartSpec, error);
    throw error;
  }
  const style = resolveChartStyle(effectiveTheme, bound.spec, options.chartThemeStyles);
  const plotStyle = resolvePlotTheme(
    effectiveTheme,
    {
      plotThemeTokens: bound.spec.plotThemeTokens,
      colors: bound.spec.colors,
      plotTheme: bound.spec.plotTheme,
    },
    options.plotThemeStyles,
  );
  const seriesColor = plotStyle.palette.series.at(0);
  if (seriesColor === undefined) throw new Error('Chart style must resolve a non-empty Plot series palette');
  const seed = bound.createSeed(chartRecipeStyleContextOf(style, seriesColor));
  let merged: ReturnType<typeof mergeChartSeed>;
  try {
    merged = mergeChartSeed(bound.spec, seed);
  } catch (error) {
    if (error instanceof ChartMemberParseError) {
      throw invalidSchemaError(ChartResolveErrorCode.InvalidResolvedPlot, error.rebasedError, error.cause);
    }
    throw error;
  }
  const {
    plotThemeTokens: recipeThemeTokens,
    colors: recipeColors,
    plotTheme: recipeTheme,
    ...plotWithoutThemeInputs
  } = merged.plotSpec;
  void recipeThemeTokens;
  void recipeColors;
  void recipeTheme;
  merged = {
    ...merged,
    plotSpec: {
      ...plotWithoutThemeInputs,
      ...(bound.spec.plotThemeTokens === undefined ? {} : { plotThemeTokens: bound.spec.plotThemeTokens }),
      ...(bound.spec.colors === undefined ? {} : { colors: bound.spec.colors }),
      ...(bound.spec.plotTheme === undefined ? {} : { plotTheme: bound.spec.plotTheme }),
    },
  };
  try {
    bound.validateCore(merged.plotSpec);
  } catch (error) {
    if (error instanceof ChartRecipeInvariantError) {
      throw new ChartResolveError(ChartResolveErrorCode.CoreRecipeViolation, {
        path: error.path,
        cause: error,
      });
    }
    throw error;
  }

  let plotSpec: IRPlotSpec;
  try {
    plotSpec = PlotSpecSchema.parse(merged.plotSpec);
  } catch (error) {
    if (error instanceof z.ZodError) throw invalidSchemaError(ChartResolveErrorCode.InvalidResolvedPlot, error);
    throw error;
  }
  const spec: InternalChartSpecBound = bound.spec;
  const presentation = resolveChartPresentation(spec.presentation, plotSpec, style.tokens);
  const inspection = createChartInspection(
    spec,
    plotSpec,
    chartInspectionMemberInputsOf(plotSpec, merged.members),
    style,
    plotStyle,
    presentation.inspection,
  );
  const node: IRChild =
    spec.id === undefined ? presentation.content : { type: 'scope', id: spec.id, children: [presentation.content] };
  return { plotSpec, node, inspection };
};
