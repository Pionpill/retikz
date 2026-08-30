import type { IRJsonObject } from '@retikz/core';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import type { IRBubbleChart } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { ChartType } from '../constants';
import {
  pointFieldConsumersOf,
  pointPropertySlotsWithoutSize,
  pointResolutionOf,
  pointSlotsOf,
  pointSpatialResolutionOf,
  pointThemeOf,
  sizeGuideOf,
} from '../shared';
import { BubbleMarkDefinition, resolveBubbleMark } from './mark';
import { BubbleChartSchema, BubbleChartThemeOverridesSchema, BubbleChartThemeResolutionSchema } from './schema';

const themeFallback: IRJsonObject = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
};

/** Bubble exact schema、调度与消费检查共用的 encoding 顺序 */
export const BubbleChartEncodingSlots = [
  'x',
  'y',
  'size',
  'color',
  'opacity',
  'shape',
  'row',
  'column',
  'facet',
] as const;

/** Bubble Chart 的内建 semantic recipe Definition */
export const BubbleChartDefinition: ChartRecipeDefinition<IRBubbleChart> = defineChartRecipe({
  chartType: ChartType.Bubble,
  encodingSlots: BubbleChartEncodingSlots,
  schema: BubbleChartSchema,
  theme: {
    overridesSchema: BubbleChartThemeOverridesSchema,
    resolutionSchema: BubbleChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: {
    encodings: BubbleChartEncodingSlots,
    properties: pointPropertySlotsWithoutSize,
  },
  marks: [
    {
      definition: BubbleMarkDefinition,
      inherit: {
        encodings: ['x', 'y', 'size', 'color', 'opacity', 'shape'],
        properties: pointPropertySlotsWithoutSize,
      },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(
      context,
      BubbleChartEncodingSlots,
      pointFieldConsumersOf(ChartType.Bubble),
    );
    const spatial = pointSpatialResolutionOf(ChartType.Bubble, context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const mark = resolveBubbleMark(slots.encodings, slots.properties);
    const sizeGuide = sizeGuideOf(theme, slots.encodings);
    return pointResolutionOf(ChartType.Bubble, theme, [{ kind: ChartType.Bubble, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
});
