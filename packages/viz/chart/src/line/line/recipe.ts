import { BuiltinPlotScale } from '@retikz/plot';

import type { ChartRecipeDefinition, ChartResolvedFieldMapping } from '../../_chart/contract';
import { defineChartRecipe } from '../../_chart/contract';
import {
  chartRecipeId,
  chartResolutionOf,
  chartSpatialResolutionOf,
  resolveChartEncodingMappings,
  resolveChartGuideDefaults,
} from '../../_chart/resolve';
import { lineMarkDefinition, resolveLineMarkGroup } from './mark';
import { LineChartSchema } from './schema';
import type { IRLineChart, IRLineChartProperties } from './schema';

const encodingSlots = ['x', 'y', 'order', 'series', 'row', 'column', 'facet'] as const;
const propertySlots = ['path', 'point'] as const;
const seriesScaleName = chartRecipeId('line', 'scale.series');

/** Line 的精确配方，只组合已有 Plot 能力 */
export const lineChartDefinition: ChartRecipeDefinition<IRLineChart> = defineChartRecipe({
  chartType: 'line',
  schema: LineChartSchema,
  encodingSlots,
  consumes: { encodings: encodingSlots, properties: propertySlots },
  marks: [
    {
      definition: lineMarkDefinition,
      inherit: { encodings: ['x', 'y', 'order', 'series'], properties: propertySlots },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(context, encodingSlots, [
      ...(['x', 'y'] as const).map(role => ({
        slot: role,
        scale: {
          family: 'position' as const,
          positionRole: role,
          recipeFallback: { name: chartRecipeId('line', `scale.${role}`), type: BuiltinPlotScale.Linear },
        },
      })),
      { slot: 'order' },
      {
        slot: 'series',
        scale: {
          family: 'channel',
          type: BuiltinPlotScale.Ordinal,
          recipeFallback: { name: seriesScaleName, type: BuiltinPlotScale.Ordinal },
        },
      },
    ]);
    const spatial = chartSpatialResolutionOf('line', context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: context =>
    chartResolutionOf(
      'line',
      [
        {
          kind: 'line',
          plotMarks: resolveLineMarkGroup(context.encodings, context.properties as IRLineChartProperties),
        },
      ],
      !Object.hasOwn(context.encodings, 'series')
        ? {}
        : {
            scales: [{ type: BuiltinPlotScale.Ordinal, name: seriesScaleName }],
            guides: [{ type: 'legend', channel: 'color' }],
          },
    ),
  resolveGuideDefaults: context => {
    const guides = resolveChartGuideDefaults(context);
    if (context.source.plotExtension?.guides !== undefined || !Object.hasOwn(context.encodings.encodings, 'series'))
      return guides;
    const series = context.encodings.encodings.series;
    const scale =
      typeof series === 'string' ? seriesScaleName : ((series as ChartResolvedFieldMapping).scale ?? seriesScaleName);
    const symbols = context.chartMarks.flatMap(mark =>
      mark.type === 'path'
        ? [
            {
              kind: 'line' as const,
              ...(mark.properties?.stroke === undefined ? { scale } : { paint: mark.properties.stroke }),
            },
          ]
        : [],
    );
    return guides.map(guide => (guide.type === 'legend' ? { ...guide, scale, symbols } : guide));
  },
});
