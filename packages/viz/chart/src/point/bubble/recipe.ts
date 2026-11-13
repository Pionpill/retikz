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
  pointPropertySlotsWithoutSize,
  resolvePointScaleDefaults,
  sizeGuideOf,
} from '../shared';
import { bubbleMarkDefinition, resolveBubbleMark } from './mark';
import type { IRBubbleChart } from './schema';
import { BubbleChartSchema } from './schema';

/** Bubble exact schema、调度与消费检查共用的 encoding 顺序 */
const bubbleChartEncodingSlots = ['x', 'y', 'size', 'color', 'opacity', 'shape', 'row', 'column', 'facet'] as const;

const bubblePropertySlots = [...pointPropertySlotsWithoutSize, 'domainPadding'] as const;

/** Bubble Chart 的内建 semantic recipe Definition */
export const bubbleChartDefinition: ChartRecipeDefinition<IRBubbleChart> = defineChartRecipe({
  chartType: ChartType.Bubble,
  encodingSlots: bubbleChartEncodingSlots,
  schema: BubbleChartSchema,
  consumes: {
    encodings: bubbleChartEncodingSlots,
    properties: bubblePropertySlots,
  },
  marks: [
    {
      definition: bubbleMarkDefinition,
      inherit: {
        encodings: ['x', 'y', 'size', 'color', 'opacity', 'shape'],
        properties: pointPropertySlotsWithoutSize,
      },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(
      context,
      bubbleChartEncodingSlots,
      pointFieldConsumersOf(ChartType.Bubble),
    );
    const spatial = chartSpatialResolutionOf(ChartType.Bubble, context.encodings);

    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const slots = chartSlotsOf(context);
    const mark = resolveBubbleMark(slots.encodings, slots.properties);
    const sizeGuide = sizeGuideOf(slots.encodings);

    return chartResolutionOf(ChartType.Bubble, [{ kind: ChartType.Bubble, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
  resolveScaleDefaults: resolvePointScaleDefaults,
  resolveGuideDefaults: resolveChartGuideDefaults,
});
