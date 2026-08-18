import type { IRPlot } from '@retikz/plot';

import { PlotSchema, resolvePlotTheme } from '@retikz/plot';
import { z } from 'zod';

import type { BoundChart } from '../../_shared';
import type { ChartResolution, ChartResolveContext } from './types';

import { RetikzChartError } from '../../error';
import { invalidChartSchemaError } from '../dispatch/bind';
import { RetikzChartResolveErrorCode } from '../dispatch/errors';
import { BaseChartSchema } from '../schemas';
import { resolveChartStyle } from '../style';
import { chartRecipeStyleContextOf } from './style';

/** 将已绑定 Chart 与当前主题解析为唯一的 Base Chart */
export const resolveChart = (chart: BoundChart, context: ChartResolveContext): ChartResolution => {
  const style = resolveChartStyle(context.theme, chart.base, context.chartThemeStyles);
  const plotStyle = resolvePlotTheme(
    context.theme,
    {
      plotThemeTokens: chart.plot.plotThemeTokens,
      plotThemeTokenRules: chart.plot.plotThemeTokenRules,
      plotTheme: chart.plot.plotTheme,
    },
    context.plotThemeStyles,
  );
  const seriesColor = plotStyle.palette.series.at(0);
  if (seriesColor === undefined) throw new RetikzChartError('Chart style must resolve a non-empty Plot series palette');

  const plotCandidate = chart.createPlot(chartRecipeStyleContextOf(style, seriesColor));

  let plotSpec: IRPlot;
  try {
    plotSpec = PlotSchema.parse(plotCandidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const rebased = new z.ZodError(error.issues.map(issue => ({ ...issue, path: ['plot', ...issue.path] })));
      throw invalidChartSchemaError(RetikzChartResolveErrorCode.InvalidResolvedPlot, rebased, error);
    }
    throw error;
  }

  const resolvedChart = BaseChartSchema.parse({ ...chart.base, plot: plotSpec });
  return { chart: resolvedChart, plotSpec };
};
