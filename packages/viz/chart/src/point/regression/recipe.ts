import type { JsonObject } from '@retikz/foundation';
import type { IRPlotGuide } from '@retikz/plot';
import { PlotGuide, BuiltinPlotScale } from '@retikz/plot';

import { defineChartRecipe } from '../../_chart/contract';
import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import {
  chartRecipeId,
  chartResolutionOf,
  chartSlotsOf,
  chartSpatialResolutionOf,
  resolveChartGuideDefaults,
  resolveChartEncodingMappings,
} from '../../_chart/resolve';
import { ChartType } from '../constants';
import { pointPositionFieldConsumersOf, resolvePointScaleDefaults } from '../shared';
import { regressionMarkDefinition, resolveRegressionMarkGroup } from './mark';
import type { IRRegressionChart } from './schema';
import { RegressionChartSchema } from './schema';

/** Regression exact schema、调度与消费检查共用的 encoding 顺序 */
const regressionChartEncodingSlots = ['x', 'y', 'series', 'row', 'column', 'facet'] as const;

const regressionMarkPropertySlots = ['method', 'sampleCount', 'extent', 'point', 'trend', 'extraMethods'] as const;

const regressionPropertySlots = [...regressionMarkPropertySlots, 'domainPadding', 'autoPadding'] as const;

const seriesScaleName = chartRecipeId(ChartType.Regression, 'scale.series');

const regressionFieldConsumers = [
  ...pointPositionFieldConsumersOf(ChartType.Regression),
  {
    slot: 'series',
    scale: {
      family: 'channel',
      type: BuiltinPlotScale.Ordinal,
      recipeFallback: { name: seriesScaleName, type: BuiltinPlotScale.Ordinal },
    },
  },
] as const;

const withSeriesFallback = (encodings: JsonObject): JsonObject => {
  if (!Object.hasOwn(encodings, 'series')) return encodings;

  const series = encodings.series;
  if (typeof series === 'string') return encodings;

  const mapping = series as JsonObject;

  return typeof mapping.scale === 'string'
    ? encodings
    : { ...encodings, series: { ...mapping, scale: seriesScaleName } };
};

/** Regression Chart 的内建 semantic recipe Definition */
export const regressionChartDefinition: ChartRecipeDefinition<IRRegressionChart> = defineChartRecipe({
  chartType: ChartType.Regression,
  encodingSlots: regressionChartEncodingSlots,
  schema: RegressionChartSchema,
  consumes: {
    encodings: regressionChartEncodingSlots,
    properties: regressionPropertySlots,
  },
  marks: [
    {
      definition: regressionMarkDefinition,
      inherit: { encodings: ['x', 'y', 'series'], properties: [...regressionMarkPropertySlots, 'autoPadding'] },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(context, regressionChartEncodingSlots, regressionFieldConsumers);
    const spatial = chartSpatialResolutionOf(ChartType.Regression, context.encodings);

    return {
      ...resolution,
      encodings: withSeriesFallback(resolution.encodings),
      ...(spatial === undefined ? {} : { spatial }),
    };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const slots = chartSlotsOf(context);
    const hasSeries = Object.hasOwn(slots.encodings, 'series');
    const guides: Array<IRPlotGuide> = hasSeries ? [{ type: PlotGuide.Legend, channel: 'stroke' }] : [];

    return chartResolutionOf(
      ChartType.Regression,
      [{ kind: ChartType.Regression, plotMarks: resolveRegressionMarkGroup(slots.encodings, slots.properties, true) }],
      {
        scales: hasSeries ? [{ type: BuiltinPlotScale.Ordinal, name: seriesScaleName }] : [],
        guides,
      },
    );
  },
  resolveScaleDefaults: resolvePointScaleDefaults,
  resolveGuideDefaults: resolveChartGuideDefaults,
});
