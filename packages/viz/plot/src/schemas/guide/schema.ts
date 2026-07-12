import {
  ArrowEndDetailSchema,
  FontSchema,
  GeometryLabelPosition,
  NodeTextAlign,
  PaintValueSchema,
  PathLineCapSchema,
  ShapeRefSchema,
  TextBlockSchema,
} from '@retikz/core';
import { z } from 'zod';

import { PlotLayerSchema } from '../layer';
import {
  AxisCardinalSide,
  AxisCrossingCorner,
  AxisCrossingLabelPolicy,
  AxisCrossingTickPolicy,
  AxisGridApplyTo,
  AxisLineExtentTarget,
  AxisPlacementKind,
  AxisTickDensityKind,
  AxisTickEndpointAffect,
  AxisTickLabelHideStrategy,
  AxisTickLabelOverflow,
  AxisTickMarkKind,
  AxisTickShapeOrientation,
  AxisTitleAnchor,
  AxisTitleBaseline,
  AxisTitleOrientation,
  GuideTickIntervalKind,
  GuideTickTimeUnit,
  LegendOrient,
  LegendPosition,
  LegendSymbolFit,
  PlotGuide,
} from './constants';

const AxisAutoPlacementSchema = z
  .strictObject({
    kind: z
      .literal(AxisPlacementKind.Auto)
      .describe('Placement discriminator: infer the axis position from the coordinate system and dimension'),
  })
  .describe('Automatic axis placement');

const AxisSidePlacementSchema = z
  .strictObject({
    kind: z
      .literal(AxisPlacementKind.Side)
      .describe('Placement discriminator: place the axis on a cardinal side of the plot area'),
    side: z.enum(AxisCardinalSide).describe('Cardinal side of the plot area: top, right, bottom, or left'),
    offset: z
      .number()
      .nonnegative()
      .optional()
      .describe('Additional outward offset in user units for axes sharing the same placement key; omit = 0'),
  })
  .describe('Cardinal-side axis placement');

const AxisEdgePlacementSchema = z
  .strictObject({
    kind: z
      .literal(AxisPlacementKind.Edge)
      .describe('Placement discriminator: place the axis on a coordinate-native edge'),
    edge: z.string().min(1).describe('Coordinate-native edge id; interpreted by the active coordinate definition'),
    offset: z
      .number()
      .nonnegative()
      .optional()
      .describe('Additional outward offset in user units for axes sharing the same native edge; omit = 0'),
  })
  .describe('Coordinate-native edge axis placement');

export const AxisGuideValueSchema = z.union([z.string(), z.number()]).describe('JSON-safe axis guide value');

const AxisOriginPlacementSchema = z
  .strictObject({
    kind: z
      .literal(AxisPlacementKind.Origin)
      .describe('Placement discriminator: place the axis at a cross-dimension data value'),
    origin: AxisGuideValueSchema.optional().describe(
      'Cross-dimension data value where this axis baseline is placed; omit = 0',
    ),
    tickSide: z
      .enum(AxisCardinalSide)
      .optional()
      .describe('Side where ticks, tick labels, and title are placed relative to the origin axis'),
    offset: z.number().optional().describe('Additional offset from the projected origin toward tickSide; omit = 0'),
  })
  .describe('Cartesian origin axis placement');

export const AxisPlacementSchema = z
  .discriminatedUnion('kind', [
    AxisAutoPlacementSchema,
    AxisSidePlacementSchema,
    AxisEdgePlacementSchema,
    AxisOriginPlacementSchema,
  ])
  .describe(
    'Axis placement mode: automatic coordinate default, cardinal plot-area side, coordinate-native edge, or cartesian origin',
  );

const OpacitySchema = z.number().min(0).max(1).describe('Opacity fraction in [0, 1]');
const NonNegativeFiniteSchema = z.number().nonnegative();
const NormalizedRatioSchema = z.number().min(0).max(1);

const textBlockHasContent = (value: unknown): boolean => {
  if (typeof value === 'string') return value.length > 0;
  if (!Array.isArray(value)) return false;
  return value.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if (line && typeof line === 'object' && 'text' in line && typeof line.text === 'string')
      return line.text.length > 0;
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
  .strictObject({
    stroke: PaintValueSchema.optional().describe('Guide line stroke paint; omit to inherit currentColor'),
    strokeWidth: z.number().nonnegative().optional().describe('Guide line stroke width in user units'),
    drawOpacity: OpacitySchema.optional().describe('Guide line stroke opacity'),
    dashPattern: z
      .array(z.number().nonnegative())
      .min(1)
      .optional()
      .describe('Guide line dash pattern lengths in user units'),
    dashOffset: z.number().optional().describe('Guide line dash offset in user units'),
  })
  .describe('Shared guide line style fields mapped to core path vocabulary');

export const AxisLineStyleSchema = GuideLineStyleSchema.extend({
  lineCap: PathLineCapSchema.optional().describe('Axis baseline stroke endpoint cap'),
})
  .strict()
  .describe('Axis baseline pure line style fields');

export const AxisGridLineStyleSchema = GuideLineStyleSchema.extend({
  lineCap: PathLineCapSchema.optional().describe('Axis grid line stroke endpoint cap'),
})
  .strict()
  .describe('Axis grid pure line style fields');

export const GuideTextStyleSchema = z
  .strictObject({
    font: FontSchema.optional().describe('Guide text font; missing fields inherit the plot text default'),
    textColor: z.string().min(1).optional().describe('Guide text color; omit to inherit currentColor'),
    opacity: OpacitySchema.optional().describe('Guide text opacity'),
    align: z.enum(NodeTextAlign).optional().describe('Multi-line guide text alignment'),
    lineHeight: z.number().positive().optional().describe('Guide text line height in user units'),
    maxTextWidth: z.number().positive().optional().describe('Maximum guide text line width before wrapping'),
  })
  .describe('Shared guide text style fields mapped to core node text vocabulary');

export const GuideTickIntervalSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal(GuideTickIntervalKind.Number).describe('Numeric fixed-step tick interval'),
      step: z.number().positive().describe('Positive numeric step between candidate ticks'),
      anchor: z
        .number()
        .optional()
        .describe('Numeric alignment anchor; omit to align from the scale domain lower bound'),
    }),
    z.strictObject({
      kind: z.literal(GuideTickIntervalKind.Time).describe('UTC time fixed-step tick interval'),
      unit: z.enum(GuideTickTimeUnit).describe('UTC time unit used by this interval'),
      step: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Positive integer number of units between candidate ticks; omit = 1'),
      anchor: z
        .union([z.string().min(1), z.number()])
        .optional()
        .describe('Epoch millisecond or ISO-like alignment anchor; omit to align from the scale domain lower bound'),
    }),
    z.strictObject({
      kind: z.literal(GuideTickIntervalKind.Category).describe('Category index fixed-step tick interval'),
      step: z.number().int().positive().describe('Positive integer category stride'),
      offset: z.number().int().nonnegative().optional().describe('Zero-based category offset; omit = 0'),
    }),
  ])
  .describe('Fixed-interval candidate tick source. Priority is values > interval > count');

export const GuideTickSourceSchema = z
  .strictObject({
    count: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Target number of guide ticks; ignored when values or interval are provided'),
    values: z
      .array(z.union([z.string(), z.number()]))
      .min(1)
      .optional()
      .describe(
        'Explicit guide tick values. Continuous scales accept numbers; time scales also accept ISO-like strings',
      ),
    interval: GuideTickIntervalSchema.optional().describe(
      'Fixed-interval candidate tick source. Used when values are omitted and before falling back to count',
    ),
  })
  .describe('Shared guide tick source: explicit values, fixed interval, or count hint');

export const GuideTickLabelFormatSchema = z
  .strictObject({
    format: z
      .string()
      .min(1)
      .optional()
      .describe('d3-format specifier for numeric ticks or UTC d3-time-format specifier for time ticks'),
  })
  .describe('Shared guide tick label formatting options');

const AxisLineExtentSchema = z
  .union([
    z.literal(AxisLineExtentTarget.PlotArea),
    z.strictObject({
      from: AxisGuideValueSchema.describe('Axis baseline negative-direction endpoint value'),
      to: AxisGuideValueSchema.describe('Axis baseline positive-direction endpoint value'),
    }),
  ])
  .describe('Axis baseline extent along the bound dimension');

const AxisArrowEndSchema = z
  .union([z.boolean(), ArrowEndDetailSchema])
  .describe('Axis arrow endpoint switch or visual detail');

const AxisLineArrowSchema = z
  .strictObject({
    negative: AxisArrowEndSchema.optional().describe('Arrow at the negative axis direction endpoint'),
    positive: AxisArrowEndSchema.optional().describe('Arrow at the positive axis direction endpoint'),
  })
  .superRefine((arrow, ctx) => {
    const hasNegative = arrow.negative !== undefined && arrow.negative !== false;
    const hasPositive = arrow.positive !== undefined && arrow.positive !== false;
    if (!hasNegative && !hasPositive) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'axis line arrow requires negative or positive arrow endpoint',
      });
    }
  })
  .describe('Axis endpoint arrows keyed by negative / positive axis direction');

export const AxisLineSchema = AxisLineStyleSchema.extend({
  extent: AxisLineExtentSchema.optional().describe(
    'Axis baseline extent; omit or plotArea spans the visible plot area',
  ),
  arrow: AxisLineArrowSchema.optional().describe('Axis endpoint arrows by negative / positive direction'),
})
  .strict()
  .describe('Axis baseline line style and structural endpoint geometry');

export const AxisTickDensitySchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal(AxisTickDensityKind.All).describe('Render all candidate ticks') }),
    z
      .strictObject({
        kind: z.literal(AxisTickDensityKind.Sample).describe('Deterministically sample candidate ticks'),
        maxCount: z.number().int().positive().optional().describe('Hard upper bound for visible ticks'),
        minGap: NonNegativeFiniteSchema.optional().describe('Minimum projected gap between adjacent visible ticks'),
        preserveEnds: z
          .boolean()
          .optional()
          .describe('Whether to always preserve first and last candidate ticks; omit = true'),
      })
      .superRefine((density, ctx) => {
        if (density.maxCount === undefined && density.minGap === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [],
            message: 'sample tick density requires maxCount or minGap',
          });
        }
      }),
  ])
  .describe('Candidate tick to visible tick density strategy');

const AxisTickEndpointPolicySchema = z
  .union([
    z.literal(false),
    z.strictObject({
      hideWhenArrow: z.boolean().optional().describe('Hide endpoint ticks near axis arrows; omit = true'),
      distance: NonNegativeFiniteSchema.optional().describe(
        'Endpoint distance threshold in user units; omit = derived from arrow and tick size',
      ),
      affect: z.enum(AxisTickEndpointAffect).optional().describe('Which tick artifacts are hidden; omit = mark'),
    }),
  ])
  .describe('Endpoint tick hiding policy near axis arrow endpoints');

const AxisTickLineMarkSchema = z
  .strictObject({
    kind: z.literal(AxisTickMarkKind.Line).describe('Line tick mark'),
    length: NonNegativeFiniteSchema.optional().describe('Line tick length in user units'),
    line: z
      .union([z.literal(false), GuideLineStyleSchema])
      .optional()
      .describe('Line tick style; false hides line marks'),
  })
  .describe('Line tick mark configuration');

const AxisTickShapeMarkBase = {
  size: NonNegativeFiniteSchema.optional().describe('Uniform shape tick size in user units'),
  width: NonNegativeFiniteSchema.optional().describe('Shape tick width; overrides size for width'),
  height: NonNegativeFiniteSchema.optional().describe('Shape tick height; overrides size for height'),
  offset: NonNegativeFiniteSchema.optional().describe(
    'Shape center offset along the tick normal; omit = half effective size',
  ),
  orientation: z.enum(AxisTickShapeOrientation).optional().describe('Shape tick rotation strategy; omit = fixed'),
  rotate: z.number().optional().describe('Additional rotation in degrees'),
  fill: PaintValueSchema.optional().describe('Shape tick fill paint'),
  stroke: PaintValueSchema.optional().describe('Shape tick stroke paint'),
  strokeWidth: NonNegativeFiniteSchema.optional().describe('Shape tick stroke width'),
  opacity: OpacitySchema.optional().describe('Shape tick node opacity'),
  drawOpacity: OpacitySchema.optional().describe('Shape tick draw opacity'),
};

const AxisTickBuiltinShapeMarkSchema = z
  .strictObject({
    kind: z
      .enum([AxisTickMarkKind.Circle, AxisTickMarkKind.Square, AxisTickMarkKind.Triangle, AxisTickMarkKind.Diamond])
      .describe('Builtin shape tick mark kind'),
    ...AxisTickShapeMarkBase,
  })
  .describe('Builtin shape tick mark configuration');

const AxisTickCustomShapeMarkSchema = z
  .strictObject({
    kind: z.literal(AxisTickMarkKind.Custom).describe('Custom core Node shape tick mark'),
    shape: z.union([z.string().min(1), ShapeRefSchema]).describe('Core shape reference used by this tick mark'),
    ...AxisTickShapeMarkBase,
  })
  .describe('Custom shape tick mark configuration');

export const AxisTickMarkSchema = z
  .union([z.literal(false), AxisTickLineMarkSchema, AxisTickBuiltinShapeMarkSchema, AxisTickCustomShapeMarkSchema])
  .describe('Axis tick mark switch and shape configuration');

export const AxisTicksSchema = z
  .strictObject({
    ...GuideTickSourceSchema.shape,
    length: z.number().nonnegative().optional().describe('Tick mark length in user units'),
    line: z
      .union([z.literal(false), GuideLineStyleSchema])
      .optional()
      .describe('Tick line style; false hides tick marks but leaves labels available'),
    density: AxisTickDensitySchema.optional().describe('Visible tick density strategy; omit = all candidate ticks'),
    endpoint: AxisTickEndpointPolicySchema.optional().describe('Endpoint tick hiding policy near axis arrows'),
    mark: AxisTickMarkSchema.optional().describe(
      'Unified tick mark slot; omit uses length / line shorthand as a line mark',
    ),
  })
  .superRefine((ticks, ctx) => {
    if (ticks.mark !== undefined && ticks.length !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['length'],
        message: 'ticks.length cannot be used together with ticks.mark',
      });
    }
    if (ticks.mark !== undefined && ticks.line !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['line'],
        message: 'ticks.line cannot be used together with ticks.mark',
      });
    }
  })
  .describe('Axis tick source and tick mark style');

export const AxisTickLabelAutoRotateSchema = z
  .strictObject({
    angles: z.array(z.number()).min(1).optional().describe('Candidate label rotation angles in degrees'),
    recoverWhenFailed: z
      .boolean()
      .optional()
      .describe('Whether to fall back to the original angle when all candidates overlap; omit = true'),
  })
  .describe('Axis tick label auto-rotation strategy');

export const AxisTickLabelAutoHideSchema = z
  .strictObject({
    strategy: z.enum(AxisTickLabelHideStrategy).optional().describe('Overlap hiding strategy; omit = greedy'),
    preserveEnds: z
      .boolean()
      .optional()
      .describe('Whether first and last labels should be preserved when possible; omit = true'),
    separation: NonNegativeFiniteSchema.optional().describe(
      'Minimum separation between label boxes in user units; omit = 0',
    ),
  })
  .describe('Axis tick label overlap hiding strategy');

export const AxisTickLabelBoundsSchema = z
  .strictObject({
    overflow: z
      .enum(AxisTickLabelOverflow)
      .optional()
      .describe('How labels outside the axis span are handled; omit = flush'),
    tolerance: NonNegativeFiniteSchema.optional().describe('Overflow tolerance in user units; omit = 1'),
  })
  .describe('Axis tick label boundary handling strategy');

export const AxisTickLabelLayoutSchema = z
  .union([
    z.literal(false),
    z.strictObject({
      rotate: z
        .union([z.literal(false), AxisTickLabelAutoRotateSchema])
        .optional()
        .describe('Auto-rotation strategy; false disables auto rotation'),
      hide: z
        .union([z.literal(false), AxisTickLabelAutoHideSchema])
        .optional()
        .describe('Overlap hiding strategy; false keeps all labels'),
      bounds: z
        .union([z.literal(false), AxisTickLabelBoundsSchema])
        .optional()
        .describe('Axis-span boundary strategy; false disables boundary handling'),
      sampleSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of labels sampled while choosing auto rotation'),
    }),
  ])
  .describe('Axis tick label adaptive layout strategy');

export const AxisTickLabelsSchema = z
  .strictObject({
    ...GuideTickLabelFormatSchema.shape,
    gap: z.number().nonnegative().optional().describe('Gap between tick end and tick label center, in user units'),
    rotate: z.number().optional().describe('Tick label rotation in degrees around the label center'),
    anchor: z.string().min(1).optional().describe('Semantic text anchor hint reserved for theme/layout resolvers'),
    layout: AxisTickLabelLayoutSchema.optional().describe(
      'Adaptive tick label rotation, hiding, and boundary handling',
    ),
    ...GuideTextStyleSchema.shape,
  })
  .describe('Axis tick label style. Text content comes from the resolved tick set');

const AxisTitlePlacementSchema = z
  .union([z.enum(GeometryLabelPosition), NormalizedRatioSchema])
  .describe('Axis title position along the baseline: keyword or normalized number from negative to positive direction');

const AxisTitleAnchorAlignSchema = z.enum([AxisTitleAnchor.Start, AxisTitleAnchor.Center, AxisTitleAnchor.End]);

const AxisTitleAnchorBaselineSchema = z.enum(AxisTitleBaseline);

const AxisTitleAnchorObjectSchema = z
  .strictObject({
    align: AxisTitleAnchorAlignSchema.optional().describe('Horizontal title anchor relative to the axis direction'),
    baseline: AxisTitleAnchorBaselineSchema.optional().describe(
      'Vertical title baseline hint reserved for text renderers',
    ),
  })
  .superRefine((anchor, ctx) => {
    if (anchor.align === undefined && anchor.baseline === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'axis title anchor object requires align or baseline',
      });
    }
  })
  .describe('Structured axis title text anchor');

const AxisTitleAnchorSchema = z
  .union([z.enum(AxisTitleAnchor), AxisTitleAnchorObjectSchema])
  .describe('Axis title anchor: auto/start/center/end shorthand or structured anchor object');

const AxisTitleShiftSchema = z
  .strictObject({
    along: z.number().optional().describe('Additional shift along the axis positive direction, in user units'),
    normal: z.number().optional().describe('Additional shift along the outward axis normal, in user units'),
  })
  .superRefine((shift, ctx) => {
    if (shift.along === undefined && shift.normal === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'axis title shift requires along or normal',
      });
    }
  })
  .describe('Axis title local offset in axis tangent/normal coordinates');

const AxisTitleLayoutSchema = z
  .union([
    z.literal(false),
    z.strictObject({
      reserveSpace: z.boolean().optional().describe('Whether this title should participate in layout reservation'),
      avoidTickLabels: z.boolean().optional().describe('Whether auto layout should avoid tick label bands'),
      avoidLineMarks: z.boolean().optional().describe('Whether auto layout should avoid axis line endpoint marks'),
      overflow: z.enum(AxisTickLabelOverflow).optional().describe('How title overflow near axis endpoints is handled'),
    }),
  ])
  .describe('Axis title adaptive layout policy');

const AxisCrossingSchema = z
  .union([
    z.literal(false),
    z
      .strictObject({
        value: AxisGuideValueSchema.optional().describe('Axis value treated as the crossing value; omit = 0'),
        tick: z
          .enum(AxisCrossingTickPolicy)
          .optional()
          .describe('Whether to render the tick mark at the crossing value; omit = show'),
        label: z
          .enum(AxisCrossingLabelPolicy)
          .optional()
          .describe('How to render the tick label at the crossing value; omit = show'),
        corner: z.enum(AxisCrossingCorner).optional().describe('Corner used when label is corner; omit = bottom-left'),
      })
      .superRefine((crossing, ctx) => {
        if (crossing.corner !== undefined && crossing.label !== AxisCrossingLabelPolicy.Corner) {
          ctx.addIssue({
            code: 'custom',
            path: ['corner'],
            message: 'axis crossing corner is only valid when label is corner',
          });
        }
      }),
  ])
  .describe('Axis crossing tick and label conflict policy');

export const AxisTitleSchema = z
  .strictObject({
    text: AxisTitleTextSchema.describe('Axis title text block'),
    padding: z
      .number()
      .nonnegative()
      .optional()
      .describe('Padding from the tick label band to the title center, in user units'),
    placement: AxisTitlePlacementSchema.optional().describe(
      'Axis title position along the axis baseline; omit = midway',
    ),
    orientation: z.enum(AxisTitleOrientation).optional().describe('Axis title rotation strategy; omit = auto'),
    rotate: z.number().optional().describe('Axis title rotation in degrees around the title center'),
    anchor: AxisTitleAnchorSchema.optional().describe('Axis title anchor relative to the title position'),
    shift: AxisTitleShiftSchema.optional().describe('Axis title local tangent/normal offset'),
    layout: AxisTitleLayoutSchema.optional().describe('Axis title adaptive layout policy'),
    ...GuideTextStyleSchema.shape,
  })
  .describe('Axis title text block and style');

export const LegendGuideStyleSchema = z
  .strictObject({
    swatchSize: z.number().positive().optional().describe('Legend swatch baseline size in user units'),
    swatchGap: z.number().nonnegative().optional().describe('Gap between a legend swatch and its label, in user units'),
    entryGap: z.number().nonnegative().optional().describe('Gap between adjacent legend entries, in user units'),
    titleGap: z
      .number()
      .nonnegative()
      .optional()
      .describe('Gap between legend title and the first entry, in user units'),
    rampLength: z.number().positive().optional().describe('Continuous legend ramp long edge length in user units'),
    rampThickness: z
      .number()
      .positive()
      .optional()
      .describe('Continuous legend ramp short edge thickness in user units'),
    symbolSize: z
      .number()
      .positive()
      .optional()
      .describe('Target visual box size for symbol-like legend entries; omit = swatchSize'),
    symbolScale: z
      .number()
      .positive()
      .optional()
      .describe('Scale factor applied to legend symbols after the fit strategy; omit = 1'),
    symbolFit: z
      .enum(LegendSymbolFit)
      .optional()
      .describe('How size legend symbols map descriptor radius into the legend symbol box; omit = fit'),
    title: GuideTextStyleSchema.optional().describe('Legend title text style'),
    label: GuideTextStyleSchema.optional().describe('Legend entry label text style'),
  })
  .describe(
    'Legend visual style tokens. Semantic fields such as position, orient, ticks, and tick label format stay on the legend guide root',
  );

const FacetTargetValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('JSON-safe facet value matched by an axis grid target selector');

const FacetTargetValueInputSchema = z
  .union([FacetTargetValueSchema, z.array(FacetTargetValueSchema).min(1)])
  .describe('Facet value or value tuple matched by an axis grid target selector');

const FacetGridTargetSelectorSchema = z
  .strictObject({
    arrangement: z.string().min(1).optional().describe('Facet arrangement id to match; omit to match any facet'),
    row: FacetTargetValueInputSchema.optional().describe('Facet row value to match; omit to match any row value'),
    column: FacetTargetValueInputSchema.optional().describe(
      'Facet column value to match; omit to match any column value',
    ),
  })
  .describe('Facet panel selector used by an axis grid target');

const TrackGridTargetSelectorSchema = z
  .strictObject({
    arrangement: z.string().min(1).optional().describe('Track arrangement id to match; omit to match any track group'),
    id: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .optional()
      .describe('Track id or ids to match; omit to match any track'),
  })
  .describe('Track arrangement selector used by an axis grid target');

export const GuideTargetSelectorSchema = z
  .strictObject({
    view: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .optional()
      .describe('Coordinate view id or ids to match'),
    facet: FacetGridTargetSelectorSchema.optional().describe('Facet panel target selector'),
    track: TrackGridTargetSelectorSchema.optional().describe('Track arrangement target selector'),
  })
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
  select: GuideTargetSelectorSchema.optional().describe('Explicit target selector; required when applyTo is selected'),
} as const;

const refineAxisGridProjection = (grid: { applyTo?: string; select?: unknown }, ctx: z.RefinementCtx): void => {
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

const AxisGridSourceShape = {
  ticks: GuideTickSourceSchema.optional().describe('Grid tick source. Omit to reuse the visible axis ticks'),
  density: AxisTickDensitySchema.optional().describe(
    'Visible grid tick density strategy; omit = all candidate grid ticks',
  ),
  bandPosition: NormalizedRatioSchema.optional().describe(
    'Position inside a band scale used by grid lines; omit = 0.5',
  ),
} as const;

const AxisMinorGridSchema = z
  .strictObject({
    ticks: GuideTickSourceSchema.describe('Minor grid tick source'),
    density: AxisTickDensitySchema.optional().describe(
      'Visible minor grid tick density strategy; omit = all candidate minor ticks',
    ),
    bandPosition: NormalizedRatioSchema.optional().describe(
      'Position inside a band scale used by minor grid lines; omit = parent bandPosition or 0.5',
    ),
    ...AxisGridLineStyleSchema.shape,
  })
  .describe('Minor axis grid line source and style configuration');

export const AxisGridSchema = z
  .strictObject(AxisGridProjectionShape)
  .superRefine(refineAxisGridProjection)
  .describe('Axis grid projection configuration');

export const AxisGridComponentSchema = z
  .strictObject({
    ...AxisGridProjectionShape,
    ...AxisGridSourceShape,
    minor: z
      .union([z.literal(false), AxisMinorGridSchema])
      .optional()
      .describe('Minor grid line configuration; false disables minor grid'),
    ...AxisGridLineStyleSchema.shape,
  })
  .superRefine(refineAxisGridProjection)
  .describe('Axis grid projection, tick source, and line style configuration');

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
    id: z.string().min(1).optional().describe('Optional guide handle used as the axis scope id and anchor target'),
    coordinateView: z
      .string()
      .min(1)
      .optional()
      .describe('Coordinate view id this axis is bound to; omit to use the plot composition default view'),
    layer: PlotLayerSchema.optional().describe(
      'Semantic plot layer override applied to the generated axis scope; axis grid keeps the grid layer',
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
    crossing: AxisCrossingSchema.optional().describe('Tick and label policy at an axis crossing value'),
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
        'Whether to draw grid lines at this axis tick positions and where to project them; omit = false. Grid may override its tick source without changing axis ticks',
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
    layer: PlotLayerSchema.optional().describe('Semantic plot layer override applied to the generated legend scope'),
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
