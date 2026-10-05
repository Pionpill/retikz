import type { IRPlotGuide } from '@retikz/plot';
import { PlotGuide, PlotScale, PlotMark, isBuiltinMark, isBuiltinScaleOperation } from '@retikz/plot';

import type { ChartRecipeDefinition, ChartRecipeResolveContext } from '../../_chart/contract';
import { defineChartRecipe } from '../../_chart/contract';
import type { ChartEncodingFieldConsumer } from '../../_chart/resolve';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { ChartType } from '../constants';
import {
  pointPositionFieldConsumersOf,
  pointResolutionOf,
  pointSlotsOf,
  pointSpatialResolutionOf,
  resolvePointGuideDefaults,
  resolvePointScaleDefaults,
} from '../shared';
import { pointRecipeId } from '../shared/plot';
import { ConnectedScatterMarkDefinition, resolveConnectedScatterMarkGroup } from './mark';
import type { IRConnectedScatterChart } from './schema';
import { ConnectedScatterChartSchema } from './schema';

/** Connected Scatter exact schema、调度与消费检查共用的 encoding 顺序 */
export const ConnectedScatterChartEncodingSlots = ['x', 'y', 'order', 'series', 'row', 'column', 'facet'] as const;

const markPropertySlots = ['point', 'path', 'colorMode'] as const;

const propertySlots = [...markPropertySlots, 'domainPadding', 'autoPadding'] as const;

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

/** Connected Scatter Chart 的内建 semantic recipe Definition */
export const ConnectedScatterChartDefinition: ChartRecipeDefinition<IRConnectedScatterChart> = defineChartRecipe({
  chartType: ChartType.ConnectedScatter,
  encodingSlots: ConnectedScatterChartEncodingSlots,
  schema: ConnectedScatterChartSchema,
  consumes: { encodings: ConnectedScatterChartEncodingSlots, properties: propertySlots },
  marks: [
    {
      definition: ConnectedScatterMarkDefinition,
      inherit: { encodings: ['x', 'y', 'order', 'series'], properties: markPropertySlots },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(context, ConnectedScatterChartEncodingSlots, consumers);
    const spatial = pointSpatialResolutionOf(ChartType.ConnectedScatter, context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const slots = pointSlotsOf(context);
    const hasSeries = Object.hasOwn(slots.encodings, 'series');
    const guides: Array<IRPlotGuide> = hasSeries ? [{ type: PlotGuide.Legend, channel: 'color' }] : [];

    return pointResolutionOf(
      ChartType.ConnectedScatter,
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
  resolveScaleDefaults: context => {
    const scales = resolvePointScaleDefaults(context);
    if (context.source.recipe.properties?.colorMode !== 'mark' || context.source.recipe.encodings.series === undefined)
      return scales;

    const series = context.encodings.encodings.series;
    const name =
      typeof series === 'string' ? seriesScaleName : ((series as { scale?: string }).scale ?? seriesScaleName);
    const original = scales.find(scale => scale.name === name);
    if (original === undefined || !isBuiltinScaleOperation(original) || original.type !== PlotScale.Ordinal) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.InvalidResolvedPlot,
        message: 'Connected Scatter mark colors require an ordinal series scale',
      });
    }

    const source = original;

    for (const role of ['point', 'path']) {
      if (scales.some(scale => scale.name === `${name}.${role}`)) {
        throw new RetikzChartError({
          code: RetikzChartErrorCode.InvalidResolvedPlot,
          message: `Connected Scatter generated scale name is occupied: ${name}.${role}`,
        });
      }
    }

    return [
      ...scales,
      ...(['point', 'path'] as const).map((role, index) => ({
        ...source,
        name: `${name}.${role}`,
        rangeIndex: {
          step: (source.rangeIndex?.step ?? 1) * 2,
          offset: (source.rangeIndex?.offset ?? 0) + index * (source.rangeIndex?.step ?? 1),
        },
      })),
    ];
  },
  resolveGuideDefaults: context => {
    const guides = resolvePointGuideDefaults(context);
    if (
      context.source.plotExtension?.guides !== undefined ||
      context.source.recipe.properties?.colorMode !== 'mark' ||
      context.source.recipe.encodings.series === undefined
    )
      return guides;

    const symbolsGuides: Array<IRPlotGuide> = [];

    for (let index = 0; index < context.chartMarks.length - 1; index += 2) {
      const path = context.chartMarks[index];
      const point = context.chartMarks[index + 1];
      if (!isBuiltinMark(path) || path.type !== PlotMark.Path || !isBuiltinMark(point) || point.type !== PlotMark.Point)
        continue;
      if (point.color?.kind !== 'field') continue;

      const paint = point.fill?.kind === 'constant' ? point.fill.value : undefined;
      const linePaint = path.stroke?.kind === 'constant' ? path.stroke.value : undefined;
      symbolsGuides.push({
        type: PlotGuide.Legend,
        channel: 'color',
        scale: point.color.scale,
        symbols: [
          {
            kind: 'line',
            ...(linePaint !== undefined
              ? { paint: linePaint }
              : path.stroke?.kind === 'field'
                ? { scale: path.stroke.scale }
                : {}),
          },
          { kind: 'point', ...(paint !== undefined ? { paint } : { scale: point.color.scale }) },
        ],
      });
    }

    return guides.flatMap(guide => (guide.type === PlotGuide.Legend ? symbolsGuides : [guide]));
  },
});
