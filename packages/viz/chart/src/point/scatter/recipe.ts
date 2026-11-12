import { defineChartRecipe } from '../../_chart/contract';
import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import {
  chartResolutionOf,
  chartSlotsOf,
  chartSpatialResolutionOf,
  resolveChartGuideDefaults,
  resolveChartEncodingMappings,
} from '../../_chart/resolve';
import { ChartType } from '../constants';
import {
  pointFieldConsumersOf,
  pointPropertySlots,
  resolvePointMark,
  resolvePointScaleDefaults,
  sizeGuideOf,
} from '../shared';
import { scatterMarkDefinition } from './mark';
import type { IRScatterChart } from './schema';
import { ScatterChartSchema } from './schema';

/** Scatter exact schema、调度与消费检查共用的encoding顺序 */
const scatterChartEncodingSlots = ['x', 'y', 'color', 'size', 'opacity', 'shape', 'row', 'column', 'facet'] as const;

const scatterPropertySlots = [...pointPropertySlots, 'domainPadding'] as const;

/** Scatter Chart 的内建 semantic recipe Definition */
export const scatterChartDefinition: ChartRecipeDefinition<IRScatterChart> = defineChartRecipe({
  chartType: ChartType.Scatter,
  encodingSlots: scatterChartEncodingSlots,
  schema: ScatterChartSchema,
  consumes: {
    encodings: scatterChartEncodingSlots,
    properties: scatterPropertySlots,
  },
  marks: [
    {
      definition: scatterMarkDefinition,
      inherit: {
        encodings: ['x', 'y', 'color', 'size', 'opacity', 'shape'],
        properties: ['autoPadding', 'color', 'size', 'opacity', 'shape'],
      },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(
      context,
      scatterChartEncodingSlots,
      pointFieldConsumersOf(ChartType.Scatter),
    );
    const spatial = chartSpatialResolutionOf(ChartType.Scatter, context.encodings);

    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const slots = chartSlotsOf(context);
    const mark = resolvePointMark(slots.encodings, slots.properties);
    const sizeGuide = sizeGuideOf(slots.encodings);

    return chartResolutionOf(ChartType.Scatter, [{ kind: ChartType.Scatter, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
  resolveScaleDefaults: resolvePointScaleDefaults,
  resolveGuideDefaults: resolveChartGuideDefaults,
});
