import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide } from '@retikz/plot';

import { PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import type { ChartEncodingFieldConsumer } from '../../_chart/resolve';
import type { IRConnectedScatterChart } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { ChartType } from '../constants';
import { pointRecipeId } from '../shared/plot';
import {
  pointPositionFieldConsumersOf,
  pointResolutionOf,
  pointSlotsOf,
  pointSpatialResolutionOf,
  pointThemeOf,
} from '../shared/recipe';
import { ConnectedScatterMarkDefinition, resolveConnectedScatterMarkGroup } from './mark';
import {
  ConnectedScatterChartSchema,
  ConnectedScatterChartThemeOverridesSchema,
  ConnectedScatterChartThemeResolutionSchema,
} from './schema';

const themeFallback: IRJsonObject = { axisEnabled: true, axisGridEnabled: true, legendEnabled: true };
export const ConnectedScatterChartEncodingSlots = ['x', 'y', 'order', 'series', 'row', 'column', 'facet'] as const;
const propertySlots = ['point', 'path'] as const;
const seriesScaleName = pointRecipeId(ChartType.ConnectedScatter, 'scale.series');
const consumers: ReadonlyArray<ChartEncodingFieldConsumer<(typeof ConnectedScatterChartEncodingSlots)[number]>> = [
  ...pointPositionFieldConsumersOf(ChartType.ConnectedScatter),
  { slot: 'order' },
  {
    slot: 'series',
    scale: {
      family: 'channel',
      type: PlotScale.Ordinal,
      recipeFallback: { name: seriesScaleName, type: PlotScale.Ordinal },
    },
  },
];

export const ConnectedScatterChartDefinition: ChartRecipeDefinition<IRConnectedScatterChart> = defineChartRecipe({
  chartType: ChartType.ConnectedScatter,
  encodingSlots: ConnectedScatterChartEncodingSlots,
  schema: ConnectedScatterChartSchema,
  theme: {
    overridesSchema: ConnectedScatterChartThemeOverridesSchema,
    resolutionSchema: ConnectedScatterChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: { encodings: ConnectedScatterChartEncodingSlots, properties: propertySlots },
  marks: [
    {
      definition: ConnectedScatterMarkDefinition,
      inherit: { encodings: ['x', 'y', 'order', 'series'], properties: propertySlots },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(context, ConnectedScatterChartEncodingSlots, consumers);
    const spatial = pointSpatialResolutionOf(ChartType.ConnectedScatter, context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const hasSeries = Object.hasOwn(slots.encodings, 'series');
    const guides: Array<IRPlotGuide> =
      hasSeries && theme.legendEnabled ? [{ type: PlotGuide.Legend, channel: 'color' }] : [];
    return pointResolutionOf(
      ChartType.ConnectedScatter,
      theme,
      [
        {
          kind: ChartType.ConnectedScatter,
          plotMarks: resolveConnectedScatterMarkGroup(slots.encodings, slots.properties),
        },
      ],
      {
        scales: hasSeries ? [{ type: PlotScale.Ordinal, name: seriesScaleName }] : [],
        guides,
      },
    );
  },
});
