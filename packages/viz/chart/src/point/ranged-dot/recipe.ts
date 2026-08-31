import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide } from '@retikz/plot';

import { PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import type { ChartEncodingFieldConsumer } from '../../_chart/resolve';
import type { IRRangedDotChart } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { ChartType } from '../constants';
import {
  pointPositionDomainPaddingOf,
  pointPositionFieldConsumersOf,
  pointSlotsOf,
  pointSpatialResolutionOf,
  pointThemeOf,
  withPointPositionDomainPadding,
} from '../shared';
import { pointAxisGuidesOf, pointCartesian2DOf, pointRecipeId } from '../shared/plot';
import { RangedDotMarkDefinition, resolveRangedDotMark } from './mark';
import {
  RangedDotChartSchema,
  RangedDotChartThemeOverridesSchema,
  RangedDotChartThemeResolutionSchema,
} from './schema';

const themeFallback: IRJsonObject = { axisEnabled: true, axisGridEnabled: true, legendEnabled: true };

/** Ranged Dot exact schema、调度与消费检查共用的 encoding 顺序 */
export const RangedDotChartEncodingSlots = ['category', 'start', 'end', 'color', 'row', 'column', 'facet'] as const;

const markPropertySlots = ['point', 'startPoint', 'endPoint', 'range'] as const;
const propertySlots = [...markPropertySlots, 'domainPadding'] as const;
const xScaleName = pointRecipeId(ChartType.RangedDot, 'scale.x');
const yScaleName = pointRecipeId(ChartType.RangedDot, 'scale.y');
const colorScaleName = pointRecipeId(ChartType.RangedDot, 'scale.color');
const [xConsumer, yConsumer] = pointPositionFieldConsumersOf(ChartType.RangedDot);

type RangedDotEncodingSlot = (typeof RangedDotChartEncodingSlots)[number];

const fieldConsumers: ReadonlyArray<ChartEncodingFieldConsumer<RangedDotEncodingSlot>> = [
  {
    ...yConsumer,
    slot: 'category',
    scale: { family: 'position', positionRole: 'y', recipeFallback: { name: yScaleName, type: PlotScale.Point } },
  },
  {
    ...xConsumer,
    slot: 'start',
    scale: { family: 'position', positionRole: 'x', recipeFallback: { name: xScaleName, type: PlotScale.Linear } },
  },
  {
    ...xConsumer,
    slot: 'end',
    scale: { family: 'position', positionRole: 'x', recipeFallback: { name: xScaleName, type: PlotScale.Linear } },
  },
  {
    slot: 'color',
    scale: {
      family: 'channel',
      type: PlotScale.Ordinal,
      recipeFallback: { name: colorScaleName, type: PlotScale.Ordinal },
    },
  },
];

const withColorFallback = (encodings: IRJsonObject): IRJsonObject => {
  if (!Object.hasOwn(encodings, 'color')) return encodings;
  const value = encodings.color;
  if (typeof value === 'string') return { ...encodings, color: { field: value, scale: colorScaleName } };
  const mapping = value as IRJsonObject;
  return typeof mapping.scale === 'string' ? encodings : { ...encodings, color: { ...mapping, scale: colorScaleName } };
};

/** Ranged Dot Chart 内建 recipe Definition */
export const RangedDotChartDefinition: ChartRecipeDefinition<IRRangedDotChart> = defineChartRecipe({
  chartType: ChartType.RangedDot,
  encodingSlots: RangedDotChartEncodingSlots,
  schema: RangedDotChartSchema,
  theme: {
    overridesSchema: RangedDotChartThemeOverridesSchema,
    resolutionSchema: RangedDotChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: { encodings: RangedDotChartEncodingSlots, properties: propertySlots },
  marks: [
    {
      definition: RangedDotMarkDefinition,
      inherit: { encodings: ['category', 'start', 'end', 'color'], properties: markPropertySlots },
    },
  ],
  resolveEncodings: context => {
    const positionDomainPadding = pointPositionDomainPaddingOf(context.source.recipe.properties ?? {});
    const resolution = withPointPositionDomainPadding(
      resolveChartEncodingMappings(context, RangedDotChartEncodingSlots, fieldConsumers),
      positionDomainPadding,
    );
    const encodings = withColorFallback(resolution.encodings);
    const spatial = pointSpatialResolutionOf(ChartType.RangedDot, {
      row: context.encodings.row,
      column: context.encodings.column,
      facet: context.encodings.facet,
    });
    return { ...resolution, encodings, ...(spatial === undefined ? {} : { spatial }) };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const hasColor = Object.hasOwn(slots.encodings, 'color');
    const positionDomainPadding = pointPositionDomainPaddingOf(slots.properties);
    const cartesian = pointCartesian2DOf(ChartType.RangedDot, positionDomainPadding);
    const scales = [
      { value: cartesian.scales[0], replaceable: true },
      { value: { type: PlotScale.Point, name: yScaleName }, replaceable: true },
      ...(hasColor ? [{ value: { type: PlotScale.Ordinal, name: colorScaleName }, replaceable: true }] : []),
    ];
    const guides: Array<IRPlotGuide> = [
      ...pointAxisGuidesOf(ChartType.RangedDot, theme),
      ...(hasColor && theme.legendEnabled ? [{ type: PlotGuide.Legend, channel: 'color' } as const] : []),
    ];
    return {
      scaffold: {
        scales,
        spatial: { coordinate: cartesian.coordinate, replaceable: true },
        guides: { value: guides, replaceable: true },
      },
      semanticMarks: [
        { kind: ChartType.RangedDot, plotMarks: [resolveRangedDotMark(slots.encodings, slots.properties)] },
      ],
    };
  },
});
