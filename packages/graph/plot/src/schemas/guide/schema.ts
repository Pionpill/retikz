import { z } from 'zod';

import { AxisCardinalSide, AxisPlacementKind, LegendOrient, LegendPosition, PlotGuide } from './constants';

const AxisAutoPlacementSchema = z
  .object({
    kind: z.literal(AxisPlacementKind.Auto).describe('Placement discriminator: infer the axis position from the coordinate system and dimension'),
  })
  .strict()
  .describe('Automatic axis placement');

const AxisSidePlacementSchema = z
  .object({
    kind: z.literal(AxisPlacementKind.Side).describe('Placement discriminator: place the axis on a cardinal side of the plot area'),
    side: z.enum(AxisCardinalSide).describe('Cardinal side of the plot area: top, right, bottom, or left'),
    offset: z
      .number()
      .nonnegative()
      .optional()
      .describe('Additional outward offset in user units for axes sharing the same placement key; omit = 0'),
  })
  .strict()
  .describe('Cardinal-side axis placement');

const AxisEdgePlacementSchema = z
  .object({
    kind: z.literal(AxisPlacementKind.Edge).describe('Placement discriminator: place the axis on a coordinate-native edge'),
    edge: z.string().min(1).describe('Coordinate-native edge id; interpreted by the active coordinate definition'),
    offset: z
      .number()
      .nonnegative()
      .optional()
      .describe('Additional outward offset in user units for axes sharing the same native edge; omit = 0'),
  })
  .strict()
  .describe('Coordinate-native edge axis placement');

export const AxisPlacementSchema = z
  .discriminatedUnion('kind', [AxisAutoPlacementSchema, AxisSidePlacementSchema, AxisEdgePlacementSchema])
  .describe('Axis placement mode: automatic coordinate default, cardinal plot-area side, or coordinate-native edge');

export const AxisGuideSchema = z
  .object({
    type: z
      .literal(PlotGuide.Axis)
      .describe('Discriminator: a coordinate axis (axis line + ticks + tick labels, with optional aligned grid lines)'),
    dimension: z
      .string()
      .min(1)
      .describe(
        'Coordinate position role this axis visualizes; resolved against the active CoordinateDefinition.roles at lowering time, not a fixed screen orientation',
      ),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional guide handle; reserved scope/anchor target (e.g. plot.xAxis / plot.yAxis region), resolution deferred to alpha.5',
      ),
    coordinateScope: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Coordinate scope id this axis is bound to; omit to use the plot composition default scope',
      ),
    placement: AxisPlacementSchema.optional().describe(
      'Axis placement mode; omit to infer an automatic placement from the active coordinate system and dimension',
    ),
    tickCount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Target number of ticks (a hint to the scale; omit to use the default tick count). Grid lines, when enabled, sit at these same tick positions',
      ),
    tickLabels: z
      .boolean()
      .optional()
      .describe(
        'Whether to render tick labels (the numeric text beside each tick); omit = true. Named tickLabels (not label) to avoid confusion with a future axis title',
      ),
    grid: z
      .boolean()
      .optional()
      .describe(
        'Whether to draw grid lines spanning the plot area at this axis tick positions; omit = false. Grid is an axis sub-property (Vega-style): its lines always align to this axis ticks, so there is no separate grid tick source',
      ),
  })
  .describe(
    'Axis guide: a coordinate axis (ticks + tick labels, with optional aligned grid lines), derived from the bound dimension scale',
  );

export const LegendGuideSchema = z
  .object({
    type: z
      .literal(PlotGuide.Legend)
      .describe(
        'Discriminator: a legend that visualizes a non-positional scale (color / size / opacity / shape) as swatches, a continuous color ramp, binned classes, or graduated symbols',
      ),
    channel: z
      .string()
      .min(1)
      .describe(
        'Non-positional channel name this legend visualizes; resolved against the channel registry at lowering time',
      ),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Disambiguating scale name when the channel is driven by more than one scale; omit when the channel has a single scale (more than one and omitted is a fail-loud error during lowering)',
      ),
    title: z
      .string()
      .optional()
      .describe(
        'Legend title rendered above the entries; omit for no title (automatic field-name title is not yet rendered)',
      ),
    position: z
      .enum(LegendPosition)
      .optional()
      .describe(
        'Which side of the plot area the legend reserves a band on; omit = right (default applied during lowering)',
      ),
    orient: z
      .enum(LegendOrient)
      .optional()
      .describe(
        'How legend entries are laid out; omit to derive from position (left/right -> vertical, top/bottom -> horizontal, applied during lowering)',
      ),
    tickCount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Target number of ticks for a continuous color ramp (a hint); meaningless for discrete legends and ignored there',
      ),
    tickLabels: z
      .boolean()
      .optional()
      .describe('Whether to render the text labels beside swatches / ramp ticks; omit = true'),
  })
  .describe(
    'Legend guide: visualizes a non-positional scale (color / size / opacity / shape), with form derived from the bound scale type',
  );

/**
 * Guide union（axis + legend；grid 是 axis 子属性、非独立成员）
 * @description type 判别位驱动的 discriminated union；后续 reference line 等新 guide 按 type 追加成员，属非破坏新增
 */
export const GuideSchema = z.discriminatedUnion('type', [AxisGuideSchema, LegendGuideSchema]);
