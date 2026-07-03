import { FontSchema, NodeTextAlign, PaintValueSchema, TextBlockSchema } from '@retikz/core';
import { z } from 'zod';

import { AxisCardinalSide, AxisGridApplyTo, AxisPlacementKind, LegendOrient, LegendPosition, PlotGuide } from './constants';

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

const OpacitySchema = z.number().min(0).max(1).describe('Opacity fraction in [0, 1]');

const textBlockHasContent = (value: unknown): boolean => {
  if (typeof value === 'string') return value.length > 0;
  if (!Array.isArray(value)) return false;
  return value.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if (line && typeof line === 'object' && 'text' in line && typeof line.text === 'string') return line.text.length > 0;
    if (line && typeof line === 'object' && 'runs' in line && Array.isArray(line.runs)) {
      return line.runs.some((run: unknown) => {
        if (!run || typeof run !== 'object') return false;
        if ('text' in run && typeof run.text === 'string') return run.text.length > 0;
        if ('tex' in run && typeof run.tex === 'string') return run.tex.length > 0;
        return false;
      });
    }
    return false;
  });
};

const nonEmptyTextBlockSchema = (label: string) =>
  TextBlockSchema.refine(textBlockHasContent, {
    message: `${label} text must not be empty`,
  });

const AxisTitleTextSchema = nonEmptyTextBlockSchema('axis title');
const LegendTitleTextSchema = nonEmptyTextBlockSchema('legend title');

export const GuideLineStyleSchema = z
  .object({
    stroke: PaintValueSchema.optional().describe('Guide line stroke paint; omit to inherit currentColor'),
    strokeWidth: z.number().nonnegative().optional().describe('Guide line stroke width in user units'),
    drawOpacity: OpacitySchema.optional().describe('Guide line stroke opacity'),
    dashPattern: z
      .array(z.number().nonnegative())
      .min(1)
      .optional()
      .describe('Guide line dash pattern lengths in user units'),
    dashOffset: z
      .number()
      .finite()
      .optional()
      .describe('Guide line dash offset in user units'),
  })
  .strict()
  .describe('Shared guide line style fields mapped to core path vocabulary');

export const GuideTextStyleSchema = z
  .object({
    font: FontSchema.optional().describe('Guide text font; missing fields inherit the plot text default'),
    textColor: z.string().min(1).optional().describe('Guide text color; omit to inherit currentColor'),
    opacity: OpacitySchema.optional().describe('Guide text opacity'),
    align: z.enum(NodeTextAlign).optional().describe('Multi-line guide text alignment'),
    lineHeight: z.number().positive().optional().describe('Guide text line height in user units'),
    maxTextWidth: z.number().positive().optional().describe('Maximum guide text line width before wrapping'),
  })
  .strict()
  .describe('Shared guide text style fields mapped to core node text vocabulary');

export const GuideTickSourceSchema = z
  .object({
    count: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Target number of guide ticks; ignored when explicit values are provided'),
    values: z
      .array(z.union([z.string(), z.number()]))
      .min(1)
      .optional()
      .describe('Explicit guide tick values. Continuous scales accept numbers; time scales also accept ISO-like strings'),
  })
  .strict()
  .describe('Shared guide tick source: count hint or explicit values');

export const GuideTickLabelFormatSchema = z
  .object({
    format: z
      .string()
      .min(1)
      .optional()
      .describe('d3-format specifier for numeric ticks or UTC d3-time-format specifier for time ticks'),
  })
  .strict()
  .describe('Shared guide tick label formatting options');

export const AxisLineSchema = GuideLineStyleSchema.describe('Axis baseline line style');

export const AxisTicksSchema = z
  .object({
    ...GuideTickSourceSchema.shape,
    length: z.number().nonnegative().optional().describe('Tick mark length in user units'),
    line: z
      .union([z.literal(false), GuideLineStyleSchema])
      .optional()
      .describe('Tick line style; false hides tick marks but leaves labels available'),
  })
  .strict()
  .describe('Axis tick source and tick mark style');

export const AxisTickLabelsSchema = z
  .object({
    ...GuideTickLabelFormatSchema.shape,
    gap: z.number().nonnegative().optional().describe('Gap between tick end and tick label center, in user units'),
    rotate: z.number().optional().describe('Tick label rotation in degrees around the label center'),
    anchor: z.string().min(1).optional().describe('Semantic text anchor hint reserved for theme/layout resolvers'),
    ...GuideTextStyleSchema.shape,
  })
  .strict()
  .describe('Axis tick label style. Text content comes from the resolved tick set');

export const AxisTitleSchema = z
  .object({
    text: AxisTitleTextSchema.describe('Axis title text block'),
    gap: z.number().nonnegative().optional().describe('Gap from the tick label band to the title center, in user units'),
    rotate: z.number().optional().describe('Axis title rotation in degrees around the title center'),
    anchor: z.string().min(1).optional().describe('Semantic text anchor hint reserved for theme/layout resolvers'),
    ...GuideTextStyleSchema.shape,
  })
  .strict()
  .describe('Axis title text block and style');

export const LegendGuideStyleSchema = z
  .object({
    swatchSize: z.number().positive().optional().describe('Legend swatch baseline size in user units'),
    swatchGap: z.number().nonnegative().optional().describe('Gap between a legend swatch and its label, in user units'),
    entryGap: z.number().nonnegative().optional().describe('Gap between adjacent legend entries, in user units'),
    titleGap: z.number().nonnegative().optional().describe('Gap between legend title and the first entry, in user units'),
    rampLength: z.number().positive().optional().describe('Continuous legend ramp long edge length in user units'),
    rampThickness: z.number().positive().optional().describe('Continuous legend ramp short edge thickness in user units'),
    title: GuideTextStyleSchema.optional().describe('Legend title text style'),
    label: GuideTextStyleSchema.optional().describe('Legend entry label text style'),
  })
  .strict()
  .describe('Legend visual style tokens. Semantic fields such as position, orient, ticks, and tick label format stay on the legend guide root');

const FacetTargetValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('JSON-safe facet value matched by an axis grid target selector');

const FacetTargetValueInputSchema = z
  .union([FacetTargetValueSchema, z.array(FacetTargetValueSchema).min(1)])
  .describe('Facet value or value tuple matched by an axis grid target selector');

const FacetGridTargetSelectorSchema = z
  .object({
    arrangement: z.string().min(1).optional().describe('Facet arrangement id to match; omit to match any facet'),
    row: FacetTargetValueInputSchema.optional().describe('Facet row value to match; omit to match any row value'),
    column: FacetTargetValueInputSchema.optional().describe(
      'Facet column value to match; omit to match any column value',
    ),
  })
  .strict()
  .describe('Facet panel selector used by an axis grid target');

const TrackGridTargetSelectorSchema = z
  .object({
    arrangement: z.string().min(1).optional().describe('Track arrangement id to match; omit to match any track group'),
    id: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .optional()
      .describe('Track id or ids to match; omit to match any track'),
  })
  .strict()
  .describe('Track arrangement selector used by an axis grid target');

export const GuideTargetSelectorSchema = z
  .object({
    view: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .optional()
      .describe('Coordinate view id or ids to match'),
    facet: FacetGridTargetSelectorSchema.optional().describe('Facet panel target selector'),
    track: TrackGridTargetSelectorSchema.optional().describe('Track arrangement target selector'),
  })
  .strict()
  .superRefine((selector, ctx) => {
    if (selector.view === undefined && selector.facet === undefined && selector.track === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'grid target selector requires view, facet, or track',
      });
    }
  })
  .describe('Axis grid target selector for coordinate views, facet panels, and shared tracks');

const AxisGridProjectionShape = {
    applyTo: z
      .enum(AxisGridApplyTo)
      .optional()
      .describe('Where this axis grid is projected; omit to use composition.resolve.grid or arrangement defaults'),
    select: GuideTargetSelectorSchema.optional().describe(
      'Explicit target selector; required when applyTo is selected',
    ),
} as const;

const refineAxisGridProjection = (
  grid: { applyTo?: string; select?: unknown },
  ctx: z.RefinementCtx,
): void => {
  if (grid.applyTo === AxisGridApplyTo.Selected && grid.select === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['select'],
      message: 'selected axis grid requires a select target selector',
    });
  }
  if (grid.applyTo !== undefined && grid.applyTo !== AxisGridApplyTo.Selected && grid.select !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['select'],
      message: 'axis grid select is only valid when applyTo is selected',
    });
  }
};

export const AxisGridSchema = z
  .object(AxisGridProjectionShape)
  .strict()
  .superRefine(refineAxisGridProjection)
  .describe('Axis grid projection configuration');

export const AxisGridComponentSchema = z
  .object({
    ...AxisGridProjectionShape,
    ...GuideLineStyleSchema.shape,
  })
  .strict()
  .superRefine(refineAxisGridProjection)
  .describe('Axis grid projection and line style configuration');

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
      .describe('Optional guide handle used as the axis scope id and anchor target'),
    coordinateView: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Coordinate view id this axis is bound to; omit to use the plot composition default view',
      ),
    placement: AxisPlacementSchema.optional().describe(
      'Axis placement mode; omit to infer an automatic placement from the active coordinate system and dimension',
    ),
    line: z
      .union([z.literal(false), AxisLineSchema])
      .optional()
      .describe('Axis baseline line; false hides the baseline while keeping ticks, labels, and grid available'),
    ticks: AxisTicksSchema.optional().describe(
      'Axis tick source and tick mark style. Grid lines, when enabled, sit at these same tick positions',
    ),
    tickLabels: z
      .union([z.literal(false), AxisTickLabelsSchema])
      .optional()
      .describe('Axis tick labels; false hides labels, object styles and formats labels, omit = defaults'),
    title: z
      .union([z.string().min(1), AxisTitleSchema])
      .optional()
      .describe('Axis title text or styled text block rendered near this axis; omit for no title'),
    grid: z
      .union([z.boolean(), AxisGridComponentSchema])
      .optional()
      .describe(
        'Whether to draw grid lines at this axis tick positions and where to project them; omit = false. Grid is an axis sub-property, so there is no separate grid tick source',
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
    title: LegendTitleTextSchema.optional().describe(
      'Legend title text block rendered above the entries; omit for no title',
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
    ticks: GuideTickSourceSchema.optional().describe(
      'Legend ramp tick source. Discrete legends ignore tick source but still honor tickLabels=false',
    ),
    tickLabels: z
      .union([z.literal(false), GuideTickLabelFormatSchema])
      .optional()
      .describe('Legend label switch and ramp tick label format; false hides labels, object formats ramp tick labels'),
    style: LegendGuideStyleSchema.optional().describe(
      'Legend-local visual token overrides. This does not change channel, scale, position, orient, or tick source semantics',
    ),
  })
  .describe(
    'Legend guide: visualizes a non-positional scale (color / size / opacity / shape), with form derived from the bound scale type',
  );

/**
 * Guide union（axis + legend；grid 是 axis 子属性、非独立成员）
 * @description type 判别位驱动的 discriminated union；后续 reference line 等新 guide 按 type 追加成员，属非破坏新增
 */
export const GuideSchema = z.discriminatedUnion('type', [AxisGuideSchema, LegendGuideSchema]);
