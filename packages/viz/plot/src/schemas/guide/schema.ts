import type { RefinementCtx } from 'zod';

import {
  ArrowEndDetailSchema,
  ContextualColorSchema,
  FontSchema,
  GeometryLabelPosition,
  LineHeightSchema,
  OpacitySchema,
  PaintValueSchema,
  PathLineCapSchema,
  ShapeValueSchema,
  StrokeWidthSchema,
  TextAlignSchema,
  TextBlockSchema,
} from '@retikz/core';
import {
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { LayoutGapSchema } from '@retikz/layout';
import {
  array,
  boolean,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  null as zodNull,
  number,
  object,
  strictObject,
  string,
  union,
} from 'zod';

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

const AxisAutoPlacementSchema = strictObject({
  kind: literal(AxisPlacementKind.Auto).describe(
    'Placement discriminator: infer the axis position from the coordinate system and dimension',
  ),
}).describe('Automatic axis placement');

const AxisSidePlacementSchema = strictObject({
  kind: literal(AxisPlacementKind.Side).describe(
    'Placement discriminator: place the axis on a cardinal side of the plot area',
  ),
  side: zodEnum(AxisCardinalSide).describe('Cardinal side of the plot area: top, right, bottom, or left'),
  offset: NonNegativeNumberSchema.optional().describe(
    'Additional outward offset in user units for axes sharing the same placement key; omit = 0',
  ),
}).describe('Cardinal-side axis placement');

const AxisEdgePlacementSchema = strictObject({
  kind: literal(AxisPlacementKind.Edge).describe('Placement discriminator: place the axis on a coordinate-native edge'),
  edge: NonBlankStringSchema.describe('Coordinate-native edge id; interpreted by the active coordinate definition'),
  offset: NonNegativeNumberSchema.optional().describe(
    'Additional outward offset in user units for axes sharing the same native edge; omit = 0',
  ),
}).describe('Coordinate-native edge axis placement');

export const AxisGuideValueSchema = union([string(), number()]).describe('JSON-safe axis guide value');

const AxisOriginPlacementSchema = strictObject({
  kind: literal(AxisPlacementKind.Origin).describe(
    'Placement discriminator: place the axis at a cross-dimension data value',
  ),
  origin: AxisGuideValueSchema.optional().describe(
    'Cross-dimension data value where this axis baseline is placed; omit = 0',
  ),
  tickSide: zodEnum(AxisCardinalSide)
    .optional()
    .describe('Side where ticks, tick labels, and title are placed relative to the origin axis'),
  offset: number().optional().describe('Additional offset from the projected origin toward tickSide; omit = 0'),
}).describe('Cartesian origin axis placement');

export const AxisPlacementSchema = discriminatedUnion('kind', [
  AxisAutoPlacementSchema,
  AxisSidePlacementSchema,
  AxisEdgePlacementSchema,
  AxisOriginPlacementSchema,
]).describe(
  'Axis placement mode: automatic coordinate default, cardinal plot-area side, coordinate-native edge, or cartesian origin',
);

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

export const GuideLineStyleSchema = strictObject({
  stroke: PaintValueSchema.optional().describe('Guide line stroke paint; omit to inherit currentColor'),
  strokeWidth: StrokeWidthSchema.optional().describe('Guide line stroke width in user units'),
  drawOpacity: OpacitySchema.optional().describe('Guide line stroke opacity'),
  dashPattern: array(NonNegativeNumberSchema)
    .min(1)
    .optional()
    .describe('Guide line dash pattern lengths in user units'),
  dashOffset: number().optional().describe('Guide line dash offset in user units'),
}).describe('Shared guide line style fields mapped to core path vocabulary');

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

export const GuideTextStyleSchema = strictObject({
  font: FontSchema.optional().describe('Guide text font; missing fields inherit the plot text default'),
  textColor: ContextualColorSchema.optional().describe(
    'Guide text color or weight resolved from the Plot typography foreground; omit to inherit currentColor',
  ),
  opacity: OpacitySchema.optional().describe('Guide text opacity'),
  align: TextAlignSchema.optional().describe('Multi-line guide text alignment'),
  lineHeight: LineHeightSchema.optional().describe('Guide text line height in user units'),
  maxTextWidth: PositiveNumberSchema.optional().describe('Maximum guide text line width before wrapping'),
}).describe('Shared guide text style fields mapped to core node text vocabulary');

export const GuideTickIntervalSchema = discriminatedUnion('kind', [
  strictObject({
    kind: literal(GuideTickIntervalKind.Number).describe('Numeric fixed-step tick interval'),
    step: PositiveNumberSchema.describe('Positive numeric step between candidate ticks'),
    anchor: number().optional().describe('Numeric alignment anchor; omit to align from the scale domain lower bound'),
  }),
  strictObject({
    kind: literal(GuideTickIntervalKind.Time).describe('UTC time fixed-step tick interval'),
    unit: zodEnum(GuideTickTimeUnit).describe('UTC time unit used by this interval'),
    step: PositiveIntegerSchema.optional().describe(
      'Positive integer number of units between candidate ticks; omit = 1',
    ),
    anchor: union([NonBlankStringSchema, number()])
      .optional()
      .describe('Epoch millisecond or ISO-like alignment anchor; omit to align from the scale domain lower bound'),
  }),
  strictObject({
    kind: literal(GuideTickIntervalKind.Category).describe('Category index fixed-step tick interval'),
    step: PositiveIntegerSchema.describe('Positive integer category stride'),
    offset: NonNegativeIntegerSchema.optional().describe('Zero-based category offset; omit = 0'),
  }),
]).describe('Fixed-interval candidate tick source. Priority is values > interval > count');

export const GuideTickSourceSchema = strictObject({
  count: PositiveIntegerSchema.optional().describe(
    'Target number of guide ticks; ignored when values or interval are provided',
  ),
  values: array(union([string(), number()]))
    .min(1)
    .optional()
    .describe('Explicit guide tick values. Continuous scales accept numbers; time scales also accept ISO-like strings'),
  interval: GuideTickIntervalSchema.optional().describe(
    'Fixed-interval candidate tick source. Used when values are omitted and before falling back to count',
  ),
}).describe('Shared guide tick source: explicit values, fixed interval, or count hint');

export const GuideTickLabelFormatSchema = strictObject({
  format: NonBlankStringSchema.optional().describe(
    'd3-format specifier for numeric ticks or UTC d3-time-format specifier for time ticks',
  ),
}).describe('Shared guide tick label formatting options');

const AxisLineExtentSchema = union([
  literal(AxisLineExtentTarget.PlotArea),
  strictObject({
    from: AxisGuideValueSchema.describe('Axis baseline negative-direction endpoint value'),
    to: AxisGuideValueSchema.describe('Axis baseline positive-direction endpoint value'),
  }),
]).describe('Axis baseline extent along the bound dimension');

const AxisArrowEndSchema = union([boolean(), ArrowEndDetailSchema]).describe(
  'Axis arrow endpoint switch or visual detail',
);

const AxisLineArrowSchema = strictObject({
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

export const AxisTickDensitySchema = discriminatedUnion('kind', [
  strictObject({ kind: literal(AxisTickDensityKind.All).describe('Render all candidate ticks') }),
  strictObject({
    kind: literal(AxisTickDensityKind.Sample).describe('Deterministically sample candidate ticks'),
    maxCount: PositiveIntegerSchema.optional().describe('Hard upper bound for visible ticks'),
    minGap: NonNegativeNumberSchema.optional().describe('Minimum projected gap between adjacent visible ticks'),
    preserveEnds: boolean()
      .optional()
      .describe('Whether to always preserve first and last candidate ticks; omit = true'),
  }).superRefine((density, ctx) => {
    if (density.maxCount === undefined && density.minGap === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'sample tick density requires maxCount or minGap',
      });
    }
  }),
]).describe('Candidate tick to visible tick density strategy');

const AxisTickEndpointPolicySchema = union([
  literal(false),
  strictObject({
    hideWhenArrow: boolean().optional().describe('Hide endpoint ticks near axis arrows; omit = true'),
    distance: NonNegativeNumberSchema.optional().describe(
      'Endpoint distance threshold in user units; omit = derived from arrow and tick size',
    ),
    affect: zodEnum(AxisTickEndpointAffect).optional().describe('Which tick artifacts are hidden; omit = mark'),
  }),
]).describe('Endpoint tick hiding policy near axis arrow endpoints');

const AxisTickLineMarkSchema = strictObject({
  kind: literal(AxisTickMarkKind.Line).describe('Line tick mark'),
  length: NonNegativeNumberSchema.optional().describe('Line tick length in user units'),
  line: union([literal(false), GuideLineStyleSchema])
    .optional()
    .describe('Line tick style; false hides line marks'),
}).describe('Line tick mark configuration');

const AxisTickShapeMarkBase = {
  size: NonNegativeNumberSchema.optional().describe('Uniform shape tick size in user units'),
  width: NonNegativeNumberSchema.optional().describe('Shape tick width; overrides size for width'),
  height: NonNegativeNumberSchema.optional().describe('Shape tick height; overrides size for height'),
  offset: NonNegativeNumberSchema.optional().describe(
    'Shape center offset along the tick normal; omit = half effective size',
  ),
  orientation: zodEnum(AxisTickShapeOrientation).optional().describe('Shape tick rotation strategy; omit = fixed'),
  rotate: number().optional().describe('Additional rotation in degrees'),
  fill: PaintValueSchema.optional().describe('Shape tick fill paint'),
  stroke: PaintValueSchema.optional().describe('Shape tick stroke paint'),
  strokeWidth: NonNegativeNumberSchema.optional().describe('Shape tick stroke width'),
  opacity: OpacitySchema.optional().describe('Shape tick node opacity'),
  drawOpacity: OpacitySchema.optional().describe('Shape tick draw opacity'),
};

const AxisTickBuiltinShapeMarkSchema = strictObject({
  kind: zodEnum([
    AxisTickMarkKind.Circle,
    AxisTickMarkKind.Square,
    AxisTickMarkKind.Triangle,
    AxisTickMarkKind.Diamond,
  ]).describe('Builtin shape tick mark kind'),
  ...AxisTickShapeMarkBase,
}).describe('Builtin shape tick mark configuration');

const AxisTickCustomShapeMarkSchema = strictObject({
  kind: literal(AxisTickMarkKind.Custom).describe('Custom core Node shape tick mark'),
  shape: ShapeValueSchema.describe('Core shape reference used by this tick mark'),
  ...AxisTickShapeMarkBase,
}).describe('Custom shape tick mark configuration');

export const AxisTickMarkSchema = union([
  literal(false),
  AxisTickLineMarkSchema,
  AxisTickBuiltinShapeMarkSchema,
  AxisTickCustomShapeMarkSchema,
]).describe('Axis tick mark switch and shape configuration');

export const AxisTicksSchema = strictObject({
  ...GuideTickSourceSchema.shape,
  length: NonNegativeNumberSchema.optional().describe('Tick mark length in user units'),
  line: union([literal(false), GuideLineStyleSchema])
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

export const AxisTickLabelAutoRotateSchema = strictObject({
  angles: array(number()).min(1).optional().describe('Candidate label rotation angles in degrees'),
  recoverWhenFailed: boolean()
    .optional()
    .describe('Whether to fall back to the original angle when all candidates overlap; omit = true'),
}).describe('Axis tick label auto-rotation strategy');

export const AxisTickLabelAutoHideSchema = strictObject({
  strategy: zodEnum(AxisTickLabelHideStrategy).optional().describe('Overlap hiding strategy; omit = greedy'),
  preserveEnds: boolean()
    .optional()
    .describe('Whether first and last labels should be preserved when possible; omit = true'),
  separation: NonNegativeNumberSchema.optional().describe(
    'Minimum separation between label boxes in user units; omit = 0',
  ),
}).describe('Axis tick label overlap hiding strategy');

export const AxisTickLabelBoundsSchema = strictObject({
  overflow: zodEnum(AxisTickLabelOverflow)
    .optional()
    .describe('How labels outside the axis span are handled; omit = flush'),
  tolerance: NonNegativeNumberSchema.optional().describe('Overflow tolerance in user units; omit = 1'),
}).describe('Axis tick label boundary handling strategy');

export const AxisTickLabelLayoutSchema = union([
  literal(false),
  strictObject({
    rotate: union([literal(false), AxisTickLabelAutoRotateSchema])
      .optional()
      .describe('Auto-rotation strategy; false disables auto rotation'),
    hide: union([literal(false), AxisTickLabelAutoHideSchema])
      .optional()
      .describe('Overlap hiding strategy; false keeps all labels'),
    bounds: union([literal(false), AxisTickLabelBoundsSchema])
      .optional()
      .describe('Axis-span boundary strategy; false disables boundary handling'),
    sampleSize: PositiveIntegerSchema.optional().describe('Number of labels sampled while choosing auto rotation'),
  }),
]).describe('Axis tick label adaptive layout strategy');

/** Axis tick 与 label 中心之间的非负间距 */
export const AxisTickLabelGapSchema = LayoutGapSchema.describe(
  'Non-negative gap between an axis tick end and its label center.',
);

/** Axis tick label 带与 title 中心之间的非负间距 */
export const AxisTitlePaddingSchema = LayoutGapSchema.describe(
  'Non-negative padding from the axis tick label band to the title center.',
);

export const AxisTickLabelsSchema = strictObject({
  ...GuideTickLabelFormatSchema.shape,
  gap: AxisTickLabelGapSchema.optional().describe('Gap between tick end and tick label center, in user units'),
  rotate: number().optional().describe('Tick label rotation in degrees around the label center'),
  anchor: NonBlankStringSchema.optional().describe('Semantic text anchor hint reserved for theme/layout resolvers'),
  layout: AxisTickLabelLayoutSchema.optional().describe('Adaptive tick label rotation, hiding, and boundary handling'),
  ...GuideTextStyleSchema.shape,
}).describe('Axis tick label style. Text content comes from the resolved tick set');

const AxisTitlePlacementSchema = union([zodEnum(GeometryLabelPosition), NormalizedFractionSchema]).describe(
  'Axis title position along the baseline: keyword or normalized number from negative to positive direction',
);

const AxisTitleAnchorAlignSchema = zodEnum([AxisTitleAnchor.Start, AxisTitleAnchor.Center, AxisTitleAnchor.End]);

const AxisTitleAnchorBaselineSchema = zodEnum(AxisTitleBaseline);

const AxisTitleAnchorObjectSchema = strictObject({
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

const AxisTitleAnchorSchema = union([zodEnum(AxisTitleAnchor), AxisTitleAnchorObjectSchema]).describe(
  'Axis title anchor: auto/start/center/end shorthand or structured anchor object',
);

const AxisTitleShiftSchema = strictObject({
  along: number().optional().describe('Additional shift along the axis positive direction, in user units'),
  normal: number().optional().describe('Additional shift along the outward axis normal, in user units'),
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

const AxisTitleLayoutSchema = union([
  literal(false),
  strictObject({
    reserveSpace: boolean().optional().describe('Whether this title should participate in layout reservation'),
    avoidTickLabels: boolean().optional().describe('Whether auto layout should avoid tick label bands'),
    avoidLineMarks: boolean().optional().describe('Whether auto layout should avoid axis line endpoint marks'),
    overflow: zodEnum(AxisTickLabelOverflow).optional().describe('How title overflow near axis endpoints is handled'),
  }),
]).describe('Axis title adaptive layout policy');

const AxisCrossingSchema = union([
  literal(false),
  strictObject({
    value: AxisGuideValueSchema.optional().describe('Axis value treated as the crossing value; omit = 0'),
    tick: zodEnum(AxisCrossingTickPolicy)
      .optional()
      .describe('Whether to render the tick mark at the crossing value; omit = show'),
    label: zodEnum(AxisCrossingLabelPolicy)
      .optional()
      .describe('How to render the tick label at the crossing value; omit = show'),
    corner: zodEnum(AxisCrossingCorner).optional().describe('Corner used when label is corner; omit = bottom-left'),
  }).superRefine((crossing, ctx) => {
    if (crossing.corner !== undefined && crossing.label !== AxisCrossingLabelPolicy.Corner) {
      ctx.addIssue({
        code: 'custom',
        path: ['corner'],
        message: 'axis crossing corner is only valid when label is corner',
      });
    }
  }),
]).describe('Axis crossing tick and label conflict policy');

export const AxisTitleSchema = strictObject({
  text: AxisTitleTextSchema.describe('Axis title text block'),
  padding: AxisTitlePaddingSchema.optional().describe(
    'Padding from the tick label band to the title center, in user units',
  ),
  placement: AxisTitlePlacementSchema.optional().describe('Axis title position along the axis baseline; omit = midway'),
  orientation: zodEnum(AxisTitleOrientation).optional().describe('Axis title rotation strategy; omit = auto'),
  rotate: number().optional().describe('Axis title rotation in degrees around the title center'),
  anchor: AxisTitleAnchorSchema.optional().describe('Axis title anchor relative to the title position'),
  shift: AxisTitleShiftSchema.optional().describe('Axis title local tangent/normal offset'),
  layout: AxisTitleLayoutSchema.optional().describe('Axis title adaptive layout policy'),
  ...GuideTextStyleSchema.shape,
}).describe('Axis title text block and style');

/** Legend swatch 的基准尺寸 */
export const LegendSwatchSizeSchema = PositiveNumberSchema.describe('Positive legend swatch size in user units.');

/** Legend ramp 的主轴长度 */
export const LegendRampLengthSchema = PositiveNumberSchema.describe('Positive legend ramp length in user units.');

/** Legend ramp 的短轴厚度 */
export const LegendRampThicknessSchema = PositiveNumberSchema.describe('Positive legend ramp thickness in user units.');

/** Legend symbol 的目标视觉盒尺寸 */
export const LegendSymbolSizeSchema = PositiveNumberSchema.describe('Positive legend symbol box size in user units.');

/** Legend symbol 在 fit 后应用的正比例 */
export const LegendSymbolScaleSchema = PositiveNumberSchema.describe('Positive legend symbol scale factor.');

/** Legend 内部相邻内容的非负间距 */
export const LegendLayoutGapSchema = LayoutGapSchema.describe('Non-negative legend layout gap in user units.');

export const LegendGuideStyleSchema = strictObject({
  swatchSize: LegendSwatchSizeSchema.optional().describe('Legend swatch baseline size in user units'),
  swatchGap: LegendLayoutGapSchema.optional().describe('Gap between a legend swatch and its label, in user units'),
  entryGap: LegendLayoutGapSchema.optional().describe('Gap between adjacent legend entries, in user units'),
  titleGap: LegendLayoutGapSchema.optional().describe('Gap between legend title and the first entry, in user units'),
  rampLength: LegendRampLengthSchema.optional().describe('Continuous legend ramp long edge length in user units'),
  rampThickness: LegendRampThicknessSchema.optional().describe(
    'Continuous legend ramp short edge thickness in user units',
  ),
  symbolSize: LegendSymbolSizeSchema.optional().describe(
    'Target visual box size for symbol-like legend entries; omit = swatchSize',
  ),
  symbolScale: LegendSymbolScaleSchema.optional().describe(
    'Scale factor applied to legend symbols after the fit strategy; omit = 1',
  ),
  symbolFit: zodEnum(LegendSymbolFit)
    .optional()
    .describe('How size legend symbols map descriptor radius into the legend symbol box; omit = fit'),
  title: GuideTextStyleSchema.optional().describe('Legend title text style'),
  label: GuideTextStyleSchema.optional().describe('Legend entry label text style'),
}).describe(
  'Legend visual style tokens. Semantic fields such as position, orient, ticks, and tick label format stay on the legend guide root',
);

const FacetTargetValueSchema = union([string(), number(), boolean(), zodNull()]).describe(
  'JSON-safe facet value matched by an axis grid target selector',
);

const FacetTargetValueOrTupleSchema = union([FacetTargetValueSchema, array(FacetTargetValueSchema).min(1)]).describe(
  'Facet value or value tuple matched by an axis grid target selector',
);

const FacetGridTargetSelectorSchema = strictObject({
  arrangement: NonBlankStringSchema.optional().describe('Facet arrangement id to match; omit to match any facet'),
  row: FacetTargetValueOrTupleSchema.optional().describe('Facet row value to match; omit to match any row value'),
  column: FacetTargetValueOrTupleSchema.optional().describe(
    'Facet column value to match; omit to match any column value',
  ),
}).describe('Facet panel selector used by an axis grid target');

const TrackGridTargetSelectorSchema = strictObject({
  arrangement: NonBlankStringSchema.optional().describe('Track arrangement id to match; omit to match any track group'),
  id: union([NonBlankStringSchema, array(NonBlankStringSchema).min(1)])
    .optional()
    .describe('Track id or ids to match; omit to match any track'),
}).describe('Track arrangement selector used by an axis grid target');

export const GuideTargetSelectorSchema = strictObject({
  view: union([NonBlankStringSchema, array(NonBlankStringSchema).min(1)])
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
  applyTo: zodEnum(AxisGridApplyTo)
    .optional()
    .describe('Where this axis grid is projected; omit to use composition.resolve.grid or arrangement defaults'),
  select: GuideTargetSelectorSchema.optional().describe('Explicit target selector; required when applyTo is selected'),
} as const;

const refineAxisGridProjection = (grid: { applyTo?: string; select?: unknown }, ctx: RefinementCtx): void => {
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
  includeDomain: boolean()
    .optional()
    .describe(
      'Whether to append missing scale-range endpoints as plot-area boundaries after grid source and density; omit = false',
    ),
  bandPosition: NormalizedFractionSchema.optional().describe(
    'Position inside a band scale used by grid lines; omit = 0.5',
  ),
} as const;

const AxisMinorGridSchema = strictObject({
  ticks: GuideTickSourceSchema.describe('Minor grid tick source'),
  density: AxisTickDensitySchema.optional().describe(
    'Visible minor grid tick density strategy; omit = all candidate minor ticks',
  ),
  bandPosition: NormalizedFractionSchema.optional().describe(
    'Position inside a band scale used by minor grid lines; omit = parent bandPosition or 0.5',
  ),
  ...AxisGridLineStyleSchema.shape,
}).describe('Minor axis grid line source and style configuration');

export const AxisGridSchema = strictObject(AxisGridProjectionShape)
  .superRefine(refineAxisGridProjection)
  .describe('Axis grid projection configuration');

export const AxisGridComponentSchema = strictObject({
  ...AxisGridProjectionShape,
  ...AxisGridSourceShape,
  minor: union([literal(false), AxisMinorGridSchema])
    .optional()
    .describe('Minor grid line configuration; false disables minor grid'),
  ...AxisGridLineStyleSchema.shape,
})
  .superRefine(refineAxisGridProjection)
  .describe('Axis grid projection, tick source, and line style configuration');

export const AxisGuideSchema = object({
  type: literal(PlotGuide.Axis).describe(
    'Discriminator: a coordinate axis (axis line + ticks + tick labels, with optional aligned grid lines)',
  ),
  dimension: NonBlankStringSchema.describe(
    'Coordinate position role this axis visualizes; resolved against the active CoordinateDefinition.roles at lowering time, not a fixed screen orientation',
  ),
  id: NonBlankStringSchema.optional().describe('Optional guide handle used as the axis scope id and anchor target'),
  coordinateView: NonBlankStringSchema.optional().describe(
    'Coordinate view id this axis is bound to; omit to use the plot composition default view',
  ),
  layer: PlotLayerSchema.optional().describe(
    'Semantic plot layer override applied to the generated axis scope; axis grid keeps the grid layer',
  ),
  placement: AxisPlacementSchema.optional().describe(
    'Axis placement mode; omit to infer an automatic placement from the active coordinate system and dimension',
  ),
  line: union([literal(false), AxisLineSchema])
    .optional()
    .describe('Axis baseline line; false hides the baseline while keeping ticks, labels, and grid available'),
  ticks: AxisTicksSchema.optional().describe(
    'Axis tick source and tick mark style. Grid lines, when enabled, sit at these same tick positions',
  ),
  crossing: AxisCrossingSchema.optional().describe('Tick and label policy at an axis crossing value'),
  tickLabels: union([literal(false), AxisTickLabelsSchema])
    .optional()
    .describe('Axis tick labels; false hides labels, object styles and formats labels, omit = defaults'),
  title: union([NonBlankStringSchema, AxisTitleSchema])
    .optional()
    .describe('Axis title text or styled text block rendered near this axis; omit for no title'),
  grid: union([boolean(), AxisGridComponentSchema])
    .optional()
    .describe(
      'Whether to draw grid lines at this axis tick positions and where to project them; omit = false. Grid may override its tick source without changing axis ticks',
    ),
}).describe(
  'Axis guide: a coordinate axis (ticks + tick labels, with optional aligned grid lines), derived from the bound dimension scale',
);

export const LegendGuideSchema = object({
  type: literal(PlotGuide.Legend).describe(
    'Discriminator: a legend that visualizes a non-positional channel as swatches, a ramp, binned classes, or graduated symbols',
  ),
  channel: NonBlankStringSchema.describe(
    'Non-positional channel name this legend visualizes; resolved against the channel registry at lowering time',
  ),
  scale: NonBlankStringSchema.optional().describe(
    'Disambiguating scale name when the channel is driven by more than one scale; omit when the channel has a single scale (more than one and omitted is a fail-loud error during lowering)',
  ),
  layer: PlotLayerSchema.optional().describe('Semantic plot layer override applied to the generated legend scope'),
  title: LegendTitleTextSchema.optional().describe(
    'Legend title text block rendered above the entries; omit for no title',
  ),
  position: zodEnum(LegendPosition)
    .optional()
    .describe(
      'Which side of the plot area the legend reserves a band on; omit = right (default applied during lowering)',
    ),
  orient: zodEnum(LegendOrient)
    .optional()
    .describe(
      'How legend entries are laid out; omit to derive from position (left/right -> vertical, top/bottom -> horizontal, applied during lowering)',
    ),
  ticks: GuideTickSourceSchema.optional().describe(
    'Legend ramp tick source; size legends read count only. Discrete legends ignore tick source but still honor tickLabels=false',
  ),
  tickLabels: union([literal(false), GuideTickLabelFormatSchema])
    .optional()
    .describe('Legend label switch and ramp tick label format; false hides labels, object formats ramp tick labels'),
  style: LegendGuideStyleSchema.optional().describe(
    'Legend-local visual token overrides. This does not change channel, scale, position, orient, or tick source semantics',
  ),
}).describe(
  'Legend guide: visualizes a non-positional channel, with form derived from the color scale or channel definition',
);

export const GuideSchema = discriminatedUnion('type', [AxisGuideSchema, LegendGuideSchema]);
