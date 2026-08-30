import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide } from '@retikz/plot';

import { PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import type { IRRegressionChart } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { ChartType } from '../constants';
import {
  pointPositionFieldConsumersOf,
  pointResolutionOf,
  pointSlotsOf,
  pointSpatialResolutionOf,
  pointThemeOf,
  withPointPositionDomainPadding,
} from '../shared';
import { pointRecipeId } from '../shared/plot';
import { RegressionMarkDefinition, resolveRegressionMarkGroup } from './mark';
import {
  RegressionChartSchema,
  RegressionChartThemeOverridesSchema,
  RegressionChartThemeResolutionSchema,
} from './schema';

const themeFallback: IRJsonObject = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
};

/** Regression exact schema、调度与消费检查共用的 encoding 顺序 */
export const RegressionChartEncodingSlots = ['x', 'y', 'series', 'row', 'column', 'facet'] as const;

const regressionPropertySlots = ['method', 'sampleCount', 'extent', 'point', 'trend'] as const;
const seriesScaleName = pointRecipeId(ChartType.Regression, 'scale.series');

const regressionFieldConsumers = [
  ...pointPositionFieldConsumersOf(ChartType.Regression),
  {
    slot: 'series',
    scale: {
      family: 'channel',
      type: PlotScale.Ordinal,
      recipeFallback: { name: seriesScaleName, type: PlotScale.Ordinal },
    },
  },
] as const;

const withSeriesFallback = (encodings: IRJsonObject): IRJsonObject => {
  if (!Object.hasOwn(encodings, 'series')) return encodings;
  const series = encodings.series;
  if (typeof series === 'string') return encodings;
  const mapping = series as IRJsonObject;
  return typeof mapping.scale === 'string'
    ? encodings
    : { ...encodings, series: { ...mapping, scale: seriesScaleName } };
};

/** Regression Chart 的内建 semantic recipe Definition */
export const RegressionChartDefinition: ChartRecipeDefinition<IRRegressionChart> = defineChartRecipe({
  chartType: ChartType.Regression,
  encodingSlots: RegressionChartEncodingSlots,
  schema: RegressionChartSchema,
  theme: {
    overridesSchema: RegressionChartThemeOverridesSchema,
    resolutionSchema: RegressionChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: {
    encodings: RegressionChartEncodingSlots,
    properties: regressionPropertySlots,
  },
  marks: [
    {
      definition: RegressionMarkDefinition,
      inherit: { encodings: ['x', 'y', 'series'], properties: regressionPropertySlots },
    },
  ],
  resolveEncodings: context => {
    const resolution = withPointPositionDomainPadding(
      resolveChartEncodingMappings(context, RegressionChartEncodingSlots, regressionFieldConsumers),
    );
    const spatial = pointSpatialResolutionOf(ChartType.Regression, context.encodings);
    return {
      ...resolution,
      encodings: withSeriesFallback(resolution.encodings),
      ...(spatial === undefined ? {} : { spatial }),
    };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const hasSeries = Object.hasOwn(slots.encodings, 'series');
    const guides: Array<IRPlotGuide> =
      hasSeries && theme.legendEnabled ? [{ type: PlotGuide.Legend, channel: 'color' }] : [];
    return pointResolutionOf(
      ChartType.Regression,
      theme,
      [{ kind: ChartType.Regression, plotMarks: resolveRegressionMarkGroup(slots.encodings, slots.properties) }],
      {
        scales: hasSeries ? [{ type: PlotScale.Ordinal, name: seriesScaleName }] : [],
        guides,
      },
    );
  },
});
