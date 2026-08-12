import type { ResolvedTheme } from '@retikz/core';
import type { IRPlotSpec, PlotThemeStyleDefinition } from '@retikz/plot';

import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { PlotSpecSchema, resolvePlotTheme } from '@retikz/plot';
import { z } from 'zod';

import type { IRChartInspection } from '../base/inspection';
import type { ChartPresentationAuthoringRecord, ChartPresentationShorthand } from '../base/presentation';
import type { IRChart } from '../base/schemas';
import type { ChartThemeStyleDefinition } from '../base/style';
import type { InternalChartSpecBound } from './recipe';

import { createChartInspection } from '../base/inspection';
import { normalizeChartPresentation, resolveChartPresentation } from '../base/presentation';
import { CHART_NAMESPACE, ChartSchema } from '../base/schemas';
import { resolveChartStyle } from '../base/style';
import { BUILTIN_POINT_CHART_RECIPES } from './catalog';
import { ChartResolveError, ChartResolveErrorCode } from './errors';
import { chartInspectionMemberInputsOf, ChartMemberParseError, mergeChartSeed } from './merge';
import { ChartRecipeInvariantError } from './recipe';
import { pointChartRecipeStyleContextOf } from './recipe';

/** Chart resolver 的内部成功结果 */
export type PointChartResolution = {
  /** merge 与最终 parse 后的 PlotSpec */
  plotSpec: IRPlotSpec;
  /** 进入唯一 chart.chart Definition 的 canonical IR */
  chart: IRChart;
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
export type PointChartResolveOptions = Readonly<{
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
}>;

/** typed Chart 在 recipe 外共享的 presentation authoring */
export type PointChartPresentationAuthoring = ChartPresentationShorthand & {
  presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
};

const DEFAULT_RESOLVED_THEME: ResolvedTheme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
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
export const resolvePointChartSpec = (
  input: unknown,
  effectiveTheme: ResolvedTheme = DEFAULT_RESOLVED_THEME,
  options: PointChartResolveOptions = {},
  presentationAuthoring: PointChartPresentationAuthoring = {},
): PointChartResolution => {
  let envelope: z.infer<typeof DispatchEnvelopeSchema>;
  try {
    envelope = DispatchEnvelopeSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) throw invalidSchemaError(ChartResolveErrorCode.InvalidChartSpec, error);
    throw error;
  }

  const recipe = BUILTIN_POINT_CHART_RECIPES.find(candidate => candidate.type === envelope.type);
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
      plotThemeTokenRules: bound.spec.plotThemeTokenRules,
      plotTheme: bound.spec.plotTheme,
    },
    options.plotThemeStyles,
  );
  const seriesColor = plotStyle.palette.series.at(0);
  if (seriesColor === undefined) throw new Error('Chart style must resolve a non-empty Plot series palette');
  const seed = bound.createSeed(pointChartRecipeStyleContextOf(style, seriesColor));
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
    plotThemeTokenRules: recipeThemeTokenRules,
    plotTheme: recipeTheme,
    ...plotWithoutThemeInputs
  } = merged.plotSpec;
  void recipeThemeTokens;
  void recipeThemeTokenRules;
  void recipeTheme;
  merged = {
    ...merged,
    plotSpec: {
      ...plotWithoutThemeInputs,
      ...(bound.spec.plotThemeTokens === undefined ? {} : { plotThemeTokens: bound.spec.plotThemeTokens }),
      ...(bound.spec.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: bound.spec.plotThemeTokenRules }),
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
  const canonicalPresentation = normalizeChartPresentation(presentationAuthoring);
  const chart = ChartSchema.parse({
    namespace: CHART_NAMESPACE,
    type: 'chart',
    ...(spec.id === undefined ? {} : { id: spec.id }),
    ...(spec.chartThemeTokens === undefined ? {} : { chartThemeTokens: spec.chartThemeTokens }),
    plot: plotSpec,
    ...(canonicalPresentation === undefined ? {} : { presentation: canonicalPresentation }),
  });
  const presentation = resolveChartPresentation(chart.presentation, plotSpec, style.tokens);
  const inspection = createChartInspection(
    { type: spec.type, ...(spec.id === undefined ? {} : { id: spec.id }) },
    plotSpec,
    chartInspectionMemberInputsOf(plotSpec, merged.members),
    style,
    plotStyle,
    presentation.inspection,
  );
  return { plotSpec, chart, inspection };
};
