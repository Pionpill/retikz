import type { IRJsonObject } from '@retikz/core';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import type { IRScatterChart } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { ChartType } from '../constants';
import {
  pointEncodingSlots,
  pointPropertySlots,
  pointResolutionOf,
  pointSlotsOf,
  pointThemeOf,
  resolvePointMark,
  sizeGuideOf,
} from '../shared/recipe';
import { ScatterMarkDefinition } from './mark';
import { ScatterChartSchema, ScatterChartThemeOverridesSchema, ScatterChartThemeResolutionSchema } from './schema';

const themeFallback: IRJsonObject = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
};

/** Scatter Chart 的内建 semantic recipe Definition */
export const ScatterChartDefinition: ChartRecipeDefinition<IRScatterChart> = defineChartRecipe({
  chartType: ChartType.Scatter,
  schema: ScatterChartSchema,
  theme: {
    overridesSchema: ScatterChartThemeOverridesSchema,
    resolutionSchema: ScatterChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: {
    encodings: pointEncodingSlots,
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
