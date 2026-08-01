import type { IRChild } from '@retikz/core';
import type { IRPlotSpec } from '@retikz/plot';

import { PlotSpecSchema } from '@retikz/plot';
import { z } from 'zod';

import type { InternalChartSpecBound } from '../providers';
import type { IRChartInspection } from '../schemas';

import { BUILTIN_CHART_RECIPES, ChartRecipeInvariantError } from '../providers';
import { CHART_NAMESPACE } from '../schemas';
import { ChartResolveError, ChartResolveErrorCode } from './errors';
import { createChartInspection } from './inspection';
import { ChartMemberParseError, mergeChartSeed } from './merge';
import { chartRecipeStyleContextOf, materializeChartPlotTheme, resolveChartStyle } from './style';

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
export const resolveChartSpec = (input: unknown): ChartResolution => {
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
  const style = resolveChartStyle(bound.spec);
  const seed = bound.createSeed(chartRecipeStyleContextOf(style));
  let merged: ReturnType<typeof mergeChartSeed>;
  try {
    merged = mergeChartSeed(bound.spec, seed);
  } catch (error) {
    if (error instanceof ChartMemberParseError) {
      throw invalidSchemaError(ChartResolveErrorCode.InvalidResolvedPlot, error.rebasedError, error.cause);
    }
    throw error;
  }
  merged = {
    ...merged,
    plotSpec: {
      ...merged.plotSpec,
      ...(bound.spec.colors === undefined ? {} : { colors: bound.spec.colors }),
      theme: materializeChartPlotTheme(style.tokens, bound.spec.colors, bound.spec.theme, merged.plotSpec.theme),
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
  const inspection = createChartInspection(spec, plotSpec, merged.members, style);
  const node: IRChild = spec.id === undefined ? plotSpec : { type: 'scope', id: spec.id, children: [plotSpec] };
  return { plotSpec, node, inspection };
};
