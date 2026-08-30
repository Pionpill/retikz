import type { IRJsonObject } from '@retikz/core';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import type { IRScatterChart } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { ChartType } from '../constants';
import {
  pointFieldConsumersOf,
  pointPropertySlots,
  pointResolutionOf,
  pointSlotsOf,
  pointSpatialResolutionOf,
  pointThemeOf,
  resolvePointMark,
  sizeGuideOf,
  withPointPositionDomainPadding,
} from '../shared';
import { ScatterMarkDefinition } from './mark';
import { ScatterChartSchema, ScatterChartThemeOverridesSchema, ScatterChartThemeResolutionSchema } from './schema';

const themeFallback: IRJsonObject = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
};

/** Scatter exact schema、调度与消费检查共用的encoding顺序 */
export const ScatterChartEncodingSlots = [
  'x',
  'y',
  'color',
  'size',
  'opacity',
  'shape',
  'row',
  'column',
  'facet',
] as const;

/** Scatter Chart 的内建 semantic recipe Definition */
export const ScatterChartDefinition: ChartRecipeDefinition<IRScatterChart> = defineChartRecipe({
  chartType: ChartType.Scatter,
  encodingSlots: ScatterChartEncodingSlots,
  schema: ScatterChartSchema,
  theme: {
    overridesSchema: ScatterChartThemeOverridesSchema,
    resolutionSchema: ScatterChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: {
    encodings: ScatterChartEncodingSlots,
    properties: pointPropertySlots,
  },
  marks: [
    {
      definition: ScatterMarkDefinition,
      inherit: {
        encodings: ['x', 'y', 'color', 'size', 'opacity', 'shape'],
        properties: ['color', 'size', 'opacity', 'shape'],
      },
    },
  ],
  resolveEncodings: context => {
    const resolution = withPointPositionDomainPadding(
      resolveChartEncodingMappings(context, ScatterChartEncodingSlots, pointFieldConsumersOf(ChartType.Scatter)),
    );
    const spatial = pointSpatialResolutionOf(ChartType.Scatter, context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const mark = resolvePointMark(slots.encodings, slots.properties);
    const sizeGuide = sizeGuideOf(theme, slots.encodings);
    return pointResolutionOf(ChartType.Scatter, theme, [{ kind: ChartType.Scatter, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
});
