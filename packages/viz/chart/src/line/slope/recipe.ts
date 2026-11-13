import { BuiltinPlotScale } from '@retikz/plot';

import type { ChartRecipeDefinition } from '../../_chart/contract';
import { defineChartRecipe } from '../../_chart/contract';
import {
  chartAxisGuidesOf,
  chartCartesian2DOf,
  chartRecipeId,
  chartSpatialResolutionOf,
  resolveChartEncodingMappings,
  resolveChartGuideDefaults,
} from '../../_chart/resolve';
import { SlopeChartType } from '../constants';
import { resolveSlopeMarkGroup, slopeMarkDefinition, slopeStagesOf } from './mark';
import { SlopeChartSchema } from './schema';
import type { IRSlopeChart, IRSlopeChartProperties } from './schema';

const encodingSlots = ['entity', 'start', 'end', 'color', 'row', 'column', 'facet'] as const;
const propertySlots = ['stages', 'path', 'point', 'label'] as const;

/** 两阶段共用数值尺度的坡度图 recipe */
export const slopeChartDefinition: ChartRecipeDefinition<IRSlopeChart> = defineChartRecipe({
  chartType: SlopeChartType,
  schema: SlopeChartSchema,
  encodingSlots,
  consumes: { encodings: encodingSlots, properties: propertySlots },
  marks: [
    {
      definition: slopeMarkDefinition,
      inherit: { encodings: ['entity', 'start', 'end', 'color'], properties: propertySlots },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(context, encodingSlots, [
      { slot: 'entity' },
      ...(['start', 'end'] as const).map(slot => ({
        slot,
        scale: {
          family: 'position' as const,
          positionRole: 'y',
          recipeFallback: { name: chartRecipeId(SlopeChartType, 'scale.y'), type: BuiltinPlotScale.Linear },
        },
      })),
      {
        slot: 'color',
        scale: {
          family: 'channel',
          type: BuiltinPlotScale.Ordinal,
          recipeFallback: { name: chartRecipeId(SlopeChartType, 'scale.color'), type: BuiltinPlotScale.Ordinal },
        },
      },
    ]);
    const spatial = chartSpatialResolutionOf(SlopeChartType, context.encodings);
    return { ...resolution, ...(spatial === undefined ? {} : { spatial }) };
  },
  resolve: context => {
    const properties = context.properties as IRSlopeChartProperties;
    const cartesian = chartCartesian2DOf(SlopeChartType);
    return {
      scaffold: {
        scales: [
          {
            value: {
              type: BuiltinPlotScale.Point,
              name: chartRecipeId(SlopeChartType, 'scale.x'),
              domain: slopeStagesOf(context.encodings, properties),
              padding: 0.5,
            },
            replaceable: true,
          },
          { value: { ...cartesian.scales[1], domainPadding: 32 }, replaceable: true },
          {
            value: { type: BuiltinPlotScale.Ordinal, name: chartRecipeId(SlopeChartType, 'scale.color') },
            replaceable: true,
          },
        ],
        spatial: { coordinate: cartesian.coordinate, replaceable: true },
        guides: { value: chartAxisGuidesOf(), replaceable: true },
      },
      semanticMarks: [{ kind: SlopeChartType, plotMarks: resolveSlopeMarkGroup(context.encodings, properties) }],
    };
  },
  resolveGuideDefaults: resolveChartGuideDefaults,
});
