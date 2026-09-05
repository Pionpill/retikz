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
  resolvePointGuideDefaults,
  resolvePointMark,
  resolvePointScaleDefaults,
  sizeGuideOf,
} from '../shared';
import { ScatterMarkDefinition } from './mark';
import { ScatterChartSchema } from './schema';

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

const scatterPropertySlots = [...pointPropertySlots, 'domainPadding'] as const;

/** Scatter Chart 的内建 semantic recipe Definition */
export const ScatterChartDefinition: ChartRecipeDefinition<IRScatterChart> = defineChartRecipe({
  chartType: ChartType.Scatter,
  encodingSlots: ScatterChartEncodingSlots,
  schema: ScatterChartSchema,
  consumes: {
    encodings: ScatterChartEncodingSlots,
    properties: scatterPropertySlots,
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
    const resolution = resolveChartEncodingMappings(
      context,
      ScatterChartEncodingSlots,
      pointFieldConsumersOf(ChartType.Scatter),
    );
    const spatial = pointSpatialResolutionOf(ChartType.Scatter, context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const slots = pointSlotsOf(context);
    const mark = resolvePointMark(slots.encodings, slots.properties);
    const sizeGuide = sizeGuideOf(slots.encodings);
    return pointResolutionOf(ChartType.Scatter, [{ kind: ChartType.Scatter, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
  resolveScaleDefaults: resolvePointScaleDefaults,
  resolveGuideDefaults: resolvePointGuideDefaults,
});
