import { JsonObjectSchema, PaintSpecSchema } from '@retikz/core';
import { z } from 'zod';
import { ArrowDetailSchema, BlendMode, BoundarySchema, DropShadowSchema, FontSchema, PathScaleSchema, ShadowPreset, ShapeRefSchema } from '@retikz/core';
import { EncodingSchema, MarkLabelSchema, PointEncodingSchema } from '../encoding';
import { BUILTIN_MARK_TYPES, IntervalBoundKind, MarkValueKind, PathClosureKind, PathCurve, PlotMark } from './constants';

/** 各 mark 变体共享的基础字段（可选 id 句柄）；encoding 各 mark 自带（位置 mark 用 EncodingSchema，reference 用专属） */
const markBase = {
  id: z.string().min(1).optional().describe('Optional mark handle; reserved scope/anchor target'),
};

/** 位置 mark（point / path / interval）的 encoding：x / y 可选（必填性下放 coordinate 级校验）+ 样式 */
const positionalEncoding = { encoding: EncodingSchema };

/** 位置 mark 的可选 datum label（priority-1 宿主路径）：lowering 时挂到该 mark 每个 datum Node 的 label */
const positionalLabel = {
  label: MarkLabelSchema.optional().describe('priority-1 datum label: lowered onto each datum Node.label (core border-relative placement)'),
};

const markValueFieldVariant = (description: string): z.ZodObject<{ kind: z.ZodLiteral<'field'>; value: z.ZodString; scale: z.ZodOptional<z.ZodString> }> =>
  z.object({
    kind: z.literal(MarkValueKind.Field).describe('Field binding variant'),
    value: z.string().min(1).describe(description),
    scale: z.string().min(1).optional().describe('Optional scale name for this field-bound style value'),
  });

const markValueSchema = <T extends z.ZodTypeAny>(constantValue: T, fieldDescription: string, constantDescription: string, schemaDescription: string) =>
  z
    .discriminatedUnion('kind', [
      markValueFieldVariant(fieldDescription).describe(`Field-bound ${schemaDescription}`),
      z
        .object({
          kind: z.literal(MarkValueKind.Constant).describe('Constant value variant'),
          value: constantValue.describe(constantDescription),
        })
        .describe(`Constant ${schemaDescription}`),
    ])
    .describe(`${schemaDescription}: field-bound datum value or constant value`);

const StylePaintSchema = z.union([z.string(), PaintSpecSchema]);
const StyleNumberSchema = z.number().finite();
const StyleNonnegativeNumberSchema = z.number().finite().nonnegative();
const StylePositiveNumberSchema = z.number().finite().positive();
const StyleOpacitySchema = z.number().min(0).max(1);
const StyleDashPatternSchema = z.array(StyleNonnegativeNumberSchema).min(1);
const StyleShadowSchema = z.union([z.enum(ShadowPreset), DropShadowSchema]);
const StyleShapeSchema = z.union([z.string().min(1), ShapeRefSchema]);
const StyleBlendModeSchema = z.enum(BlendMode);

export const PointFillStyleSchema = markValueSchema(StylePaintSchema, 'Data field path bound to point fill paint', 'Constant core Node fill paint', 'point fill style value');
export const PointColorStyleSchema = markValueSchema(z.string().min(1), 'Data field path bound to point color', 'Constant point color', 'point color value');
export const PointSizeStyleSchema = markValueSchema(StyleNonnegativeNumberSchema, 'Data field path bound to point size', 'Constant final glyph radius', 'point size value');
export const PointShapeStyleSchema = markValueSchema(StyleShapeSchema, 'Data field path bound to point shape', 'Constant core Node shape name or shape ref', 'point shape value');
export const PointStrokeStyleSchema = markValueSchema(StylePaintSchema, 'Data field path bound to point stroke paint', 'Constant core Node stroke paint', 'point stroke style value');
export const PointNumberStyleSchema = markValueSchema(StyleNumberSchema, 'Data field path bound to a numeric point style value', 'Constant numeric style value', 'point numeric style value');
export const PointNonnegativeNumberStyleSchema = markValueSchema(
  StyleNonnegativeNumberSchema,
  'Data field path bound to a non-negative point style value',
  'Constant non-negative style value',
  'point non-negative numeric style value',
);
export const PointOpacityStyleSchema = markValueSchema(StyleOpacitySchema, 'Data field path bound to an opacity style value', 'Constant opacity value 0..1', 'point opacity style value');
export const PointZIndexStyleSchema = markValueSchema(z.number().int().finite(), 'Data field path bound to zIndex', 'Constant integer zIndex value', 'point zIndex style value');
export const NodePositiveNumberStyleSchema = markValueSchema(StylePositiveNumberSchema, 'Data field path bound to a positive node style value', 'Constant positive node style value', 'node positive numeric style value');
export const NodeTextAlignStyleSchema = markValueSchema(z.enum(['left', 'center', 'right']), 'Data field path bound to node text align', 'Constant core Node align', 'node text align style value');
export const NodeBooleanStyleSchema = markValueSchema(z.boolean(), 'Data field path bound to a boolean node style value', 'Constant boolean node style value', 'node boolean style value');
export const NodeDashPatternStyleSchema = markValueSchema(StyleDashPatternSchema, 'Data field path bound to node dashPattern', 'Constant core Node dashPattern', 'node dashPattern style value');
export const NodeFontStyleSchema = markValueSchema(FontSchema, 'Data field path bound to node font', 'Constant core Node font', 'node font style value');
export const NodeBoundaryStyleSchema = markValueSchema(BoundarySchema, 'Data field path bound to node boundary', 'Constant core Node boundary', 'node boundary style value');
export const ShadowStyleSchema = markValueSchema(StyleShadowSchema, 'Data field path bound to shadow', 'Constant core shadow preset or object', 'shadow style value');
export const BlendModeStyleSchema = markValueSchema(StyleBlendModeSchema, 'Data field path bound to blendMode', 'Constant core blendMode', 'blendMode style value');
export const PathLineCapStyleSchema = markValueSchema(z.enum(['butt', 'round', 'square']), 'Data field path bound to a path lineCap value', 'Constant core Path lineCap', 'path lineCap style value');
export const PathLineJoinStyleSchema = markValueSchema(z.enum(['miter', 'round', 'bevel']), 'Data field path bound to a path lineJoin value', 'Constant core Path lineJoin', 'path lineJoin style value');
export const PathRoundedCornersStyleSchema = markValueSchema(
  StyleNonnegativeNumberSchema,
  'Data field path bound to path roundedCorners',
  'Constant core Path roundedCorners radius',
  'path roundedCorners style value',
);
export const PathFillRuleStyleSchema = markValueSchema(z.enum(['nonzero', 'evenodd']), 'Data field path bound to path fillRule', 'Constant core Path fillRule', 'path fillRule style value');
export const PathThicknessStyleSchema = markValueSchema(
  z.enum(['ultraThin', 'veryThin', 'thin', 'semithick', 'thick', 'veryThick', 'ultraThick']),
  'Data field path bound to path thickness',
  'Constant core Path thickness preset',
  'path thickness style value',
);
export const PathArrowStyleSchema = markValueSchema(z.enum(['none', '->', '<-', '<->']), 'Data field path bound to path arrow direction', 'Constant core Path arrow direction', 'path arrow style value');
export const PathScaleStyleSchema = markValueSchema(PathScaleSchema, 'Data field path bound to path scale', 'Constant core Path scale', 'path scale style value');
export const PathArrowDetailStyleSchema = markValueSchema(ArrowDetailSchema, 'Data field path bound to path arrowDetail', 'Constant core Path arrowDetail', 'path arrowDetail style value');

const PathCycleClosureSchema = z
  .object({
    kind: z.literal(PathClosureKind.Cycle).describe('Cycle closure: connect the final point back to the first point'),
  })
  .describe('Path cycle closure: closes the path as a polygon; set fill to render an area');

const PathBaselineClosureSchema = z
  .object({
    kind: z.literal(PathClosureKind.Baseline).describe('Baseline closure: return from the upper outline to a baseline value'),
    baseline: z
      .number()
      .finite()
      .optional()
      .describe('Constant baseline value for the return edge; omit to use 0 when it is inside the value-axis domain, otherwise the nearest value-axis domain edge. Finite-only to keep the IR JSON round-trippable'),
  })
  .describe('Path baseline closure: closes the upper outline down to a baseline; set fill to render an area');

const PathStackClosureSchema = z
  .object({
    kind: z.literal(PathClosureKind.Stack).describe('Stack closure: return from the upper outline to a per-row baseline field'),
    baselineField: z.string().min(1).describe('Data field path for the lower boundary value, such as y0 from a stack transform; the upper boundary still comes from encoding.y'),
  })
  .describe('Path stack closure: closes the upper outline against a per-row lower-bound field; set fill to render an area');

export const PathClosureSchema = z
  .discriminatedUnion('kind', [PathCycleClosureSchema, PathBaselineClosureSchema, PathStackClosureSchema])
  .describe('Path closure strategy: cycle, baseline, or per-row stacked baseline. Providing closure makes PathMark geometrically closed; fill still controls whether the path is painted as an area');

const coreNodeStyle = {
  align: NodeTextAlignStyleSchema.optional().describe('Core Node text alignment: field-bound datum channel or constant left / center / right'),
  lineHeight: NodePositiveNumberStyleSchema.optional().describe('Core Node lineHeight: field-bound datum channel or constant positive value'),
  maxTextWidth: NodePositiveNumberStyleSchema.optional().describe('Core Node maxTextWidth: field-bound datum channel or constant positive value'),
  cornerRadius: PointNonnegativeNumberStyleSchema.optional().describe('Core Node cornerRadius: field-bound datum channel or constant non-negative value'),
  scale: NodePositiveNumberStyleSchema.optional().describe('Core Node uniform scale: field-bound datum channel or constant positive value'),
  xScale: NodePositiveNumberStyleSchema.optional().describe('Core Node xScale: field-bound datum channel or constant positive value'),
  yScale: NodePositiveNumberStyleSchema.optional().describe('Core Node yScale: field-bound datum channel or constant positive value'),
  innerXSep: PointNonnegativeNumberStyleSchema.optional().describe('Core Node innerXSep: field-bound datum channel or constant non-negative value'),
  innerYSep: PointNonnegativeNumberStyleSchema.optional().describe('Core Node innerYSep: field-bound datum channel or constant non-negative value'),
  outerSep: PointNonnegativeNumberStyleSchema.optional().describe('Core Node outerSep: field-bound datum channel or constant non-negative value'),
  margin: PointNonnegativeNumberStyleSchema.optional().describe('Core Node margin: field-bound datum channel or constant non-negative value'),
  dashed: NodeBooleanStyleSchema.optional().describe('Core Node dashed: field-bound datum channel or constant boolean'),
  dotted: NodeBooleanStyleSchema.optional().describe('Core Node dotted: field-bound datum channel or constant boolean'),
  dashPattern: NodeDashPatternStyleSchema.optional().describe('Core Node dashPattern: field-bound datum channel or constant number array'),
  font: NodeFontStyleSchema.optional().describe('Core Node font: field-bound datum channel or constant font object'),
  boundary: NodeBoundaryStyleSchema.optional().describe('Core Node boundary: field-bound datum channel or constant boundary value'),
  shadow: ShadowStyleSchema.optional().describe('Core Node shadow: field-bound datum channel or constant preset / object'),
  blendMode: BlendModeStyleSchema.optional().describe('Core Node blendMode: field-bound datum channel or constant blend mode'),
};

const corePathStyle = {
  fill: PointFillStyleSchema.optional().describe('Core Path fill paint: field-bound datum channel or constant CSS color / PaintSpec'),
  stroke: PointStrokeStyleSchema.optional().describe('Core Path stroke paint: field-bound datum channel or constant CSS color / PaintSpec'),
  drawOpacity: PointOpacityStyleSchema.optional().describe('Core Path drawOpacity: field-bound datum channel or constant opacity 0..1'),
  zIndex: PointZIndexStyleSchema.optional().describe('Core Path zIndex: field-bound datum channel or constant integer'),
  rotate: PointNumberStyleSchema.optional().describe('Core Path rotate: field-bound datum channel or constant angle'),
  scale: PathScaleStyleSchema.optional().describe('Core Path scale: field-bound datum channel or constant number / {x,y}'),
  fillRule: PathFillRuleStyleSchema.optional().describe('Core Path fillRule: field-bound datum channel or constant nonzero / evenodd'),
  thickness: PathThicknessStyleSchema.optional().describe('Core Path thickness: field-bound datum channel or constant preset'),
  arrow: PathArrowStyleSchema.optional().describe('Core Path arrow: field-bound datum channel or constant arrow direction'),
  dashPattern: NodeDashPatternStyleSchema.optional().describe('Core Path dashPattern: field-bound datum channel or constant number array'),
  arrowDetail: PathArrowDetailStyleSchema.optional().describe('Core Path arrowDetail: field-bound datum channel or constant object'),
  shadow: ShadowStyleSchema.optional().describe('Core Path shadow: field-bound datum channel or constant preset / object'),
  blendMode: BlendModeStyleSchema.optional().describe('Core Path blendMode: field-bound datum channel or constant blend mode'),
};

export const PointMarkSchema = z
  .object({
    type: z.literal(PlotMark.Point).describe('Discriminator: one glyph or text label per record'),
    color: PointColorStyleSchema.optional().describe('Glyph color: field-bound datum channel or constant color; overrides constant fill'),
    textColor: PointColorStyleSchema.optional().describe('Text point color: field-bound datum channel or constant core Node textColor; only applied when encoding.text is set'),
    size: PointSizeStyleSchema.optional().describe('Glyph size: field-bound datum channel via a sqrt radius scale or constant final radius'),
    shape: PointShapeStyleSchema.optional().describe('Glyph shape: field-bound categorical channel or constant core Node shape name'),
    fill: PointFillStyleSchema.optional().describe('Glyph fill: field-bound datum channel or constant core Node fill paint'),
    stroke: PointStrokeStyleSchema.optional().describe('Glyph stroke paint: field-bound datum channel or constant core Node stroke paint'),
    strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe('Glyph stroke width: field-bound datum channel or constant core Node stroke width'),
    fillOpacity: PointOpacityStyleSchema.optional().describe('Glyph fill opacity: field-bound datum channel or constant opacity 0..1'),
    drawOpacity: PointOpacityStyleSchema.optional().describe('Glyph stroke opacity: field-bound datum channel or constant opacity 0..1'),
    opacity: PointOpacityStyleSchema.optional().describe('Glyph whole-node opacity: field-bound datum channel or constant opacity 0..1'),
    rotate: PointNumberStyleSchema.optional().describe('Glyph rotation in degrees: field-bound datum channel or constant angle'),
    padding: PointNonnegativeNumberStyleSchema.optional().describe('Node padding in user units: field-bound datum channel or constant padding; default 0 for point glyphs'),
    minimumSize: PointNonnegativeNumberStyleSchema.optional().describe('Minimum visual size: field-bound datum channel or constant size; overridden per datum by size'),
    minimumWidth: PointNonnegativeNumberStyleSchema.optional().describe('Minimum visual width: field-bound datum channel or constant width'),
    minimumHeight: PointNonnegativeNumberStyleSchema.optional().describe('Minimum visual height: field-bound datum channel or constant height'),
    zIndex: PointZIndexStyleSchema.optional().describe('Drawing order hint: field-bound datum channel or constant zIndex'),
    ...coreNodeStyle,
    dx: z
      .number()
      .finite()
      .optional()
      .describe('Fine-tuning horizontal offset (user units) from the projected anchor; positive = right. Mainly for text points; prefer label position/distance. Default 0'),
    dy: z
      .number()
      .finite()
      .optional()
      .describe('Fine-tuning vertical offset (user units) from the projected anchor; positive = screen-down. Mainly for text points. Default 0'),
    ...markBase,
    ...positionalLabel,
    encoding: PointEncodingSchema,
  })
  .describe('Point mark: scatter glyph or borderless text label (encoding.text set → text Node); supports optional size / opacity / shape glyph channels');

export const PathMarkSchema = z
  .object({
    type: z.literal(PlotMark.Path).describe('Discriminator: ordered points connected into a 1D path'),
    order: z.string().min(1).optional().describe('Data field driving connection order; omit for data array order (minimal relation)'),
    series: z
      .string()
      .min(1)
      .optional()
      .describe('Series field: split records into one path per distinct value (multi-series); each series gets its own color via the color scale'),
    closed: z
      .boolean()
      .optional()
      .describe('Connect the last point back to the first, closing the path into a polygon; under polar this yields a radar outline. Default false'),
    connectNulls: z
      .boolean()
      .optional()
      .describe('Whether invalid or missing projected points should be skipped and connected across; default false splits the path into separate core Path segments'),
    closure: PathClosureSchema.optional().describe('Close the path using a cycle, a baseline, or a per-row stacked baseline. Set fill when the closed path should render as an area'),
    curve: z
      .enum(PathCurve)
      .optional()
      .describe('Connection curve between adjacent ordered points; default linear'),
    strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe('Path stroke width: field-bound datum channel or constant core Path stroke width'),
    opacity: PointOpacityStyleSchema.optional().describe('Path whole opacity: field-bound datum channel or constant opacity 0..1'),
    lineCap: PathLineCapStyleSchema.optional().describe('Path stroke endpoint style: field-bound datum channel or constant core Path lineCap'),
    lineJoin: PathLineJoinStyleSchema.optional().describe('Path stroke join style: field-bound datum channel or constant core Path lineJoin'),
    roundedCorners: PathRoundedCornersStyleSchema.optional().describe('Path geometric corner radius: field-bound datum channel or constant core Path roundedCorners'),
    ...corePathStyle,
    ...markBase,
    ...positionalLabel,
    ...positionalEncoding,
  })
  .describe('Path mark: connects records in order into a 1D trajectory (line / radar outline)');

const BandBoundSchema = z
  .object({
    kind: z.literal(IntervalBoundKind.Band).describe('Band bound: center from the role position channel, width from the band scale bandwidth'),
    group: z
      .string()
      .min(1)
      .optional()
      .describe('Series field that subdivides the band into equal sub-bands (grouped / dodge); omit for a full-width band'),
  })
  .describe('Band bound: a category band on this role (bar primary, heatmap axis, polar angle band); optional group → dodge sub-bands');

const SpanBoundSchema = z
  .object({
    kind: z.literal(IntervalBoundKind.Span).describe('Span bound: from a baseline to the role position channel value'),
    baseline: z.number().finite().optional().describe('Baseline the span starts from; the interval runs baseline→channel value. Default 0'),
  })
  .describe('Span bound: baseline→value interval (bar height, radial-bar radius)');

const ExtentBoundSchema = z
  .object({
    kind: z.literal(IntervalBoundKind.Extent).describe('Extent bound: an explicit interval read from two fields'),
    from: z.string().min(1).describe('Lower-bound field (e.g. stack y0 / bin start / cumulative start angle)'),
    to: z.string().min(1).describe('Upper-bound field (e.g. stack y1 / bin end / cumulative end angle)'),
  })
  .describe('Extent bound: explicit [from, to] field interval (histogram bin / stacked bar / cumulative pie angle)');

const ProportionalBoundSchema = z
  .object({
    kind: z.literal(IntervalBoundKind.Proportional).describe('Proportional bound: contiguous intervals whose widths are driven by a numeric field'),
    field: z
      .string()
      .min(1)
      .describe('Non-negative numeric field used to build contiguous proportional intervals along this role'),
  })
  .describe('Proportional bound: contiguous variable-width intervals along this role (variable-width bar / mosaic)');

const FullBoundSchema = z
  .object({
    kind: z.literal(IntervalBoundKind.Full).describe('Full bound: span the whole coordinate domain of this role'),
  })
  .describe('Full bound: spans the role coordinate domain (pie / donut radius, inner→outer)');

export const IntervalBoundSchema = z
  .discriminatedUnion('kind', [BandBoundSchema, SpanBoundSchema, ExtentBoundSchema, ProportionalBoundSchema, FullBoundSchema])
  .describe('Single-role interval bound source: band / span / extent / proportional / full');

export const IntervalBoundsSchema = z
  .object({
    x: IntervalBoundSchema.optional().describe(
      'Primary-role interval bound (coordinate maps x→primary: cartesian2D horizontal, polar2D angle); omit to infer from the scale (band scale → band)',
    ),
    y: IntervalBoundSchema.optional().describe(
      'Secondary-role interval bound (coordinate maps y→secondary: cartesian2D vertical, polar2D radius); omit to infer (continuous scale → span from 0)',
    ),
    z: IntervalBoundSchema.optional().describe(
      'z-role interval bound for ternary2D; omit to infer a span from 0 to the z component when the coordinate consumes z',
    ),
  })
  .catchall(IntervalBoundSchema)
  .describe('Per-role interval bounds keyed by coordinate role; built-ins use x / y / z, custom coordinates may add role keys');

export const IntervalMarkSchema = z
  .object({
    type: z
      .literal(PlotMark.Interval)
      .describe('Discriminator: an orthogonal interval product projected to a segment / rectangle / sector / cell by the coordinate system'),
    series: z.string().min(1).optional().describe('Series field: split records into multiple interval series (color grouping; sub-band grouping when bounds.x is a band with group)'),
    bounds: IntervalBoundsSchema.optional().describe('Per-role interval bounds keyed by coordinate role; omit to infer from the coordinate role'),
    strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe('Interval cell stroke width: field-bound datum channel or constant core Node stroke width'),
    fill: PointFillStyleSchema.optional().describe('Interval cell fill paint: field-bound datum channel or constant CSS color / PaintSpec'),
    stroke: PointStrokeStyleSchema.optional().describe('Interval cell stroke paint: field-bound datum channel or constant CSS color / PaintSpec'),
    opacity: PointOpacityStyleSchema.optional().describe('Interval cell whole opacity: field-bound datum channel or constant opacity 0..1'),
    fillOpacity: PointOpacityStyleSchema.optional().describe('Interval cell fill opacity: field-bound datum channel or constant opacity 0..1'),
    ...coreNodeStyle,
    ...markBase,
    ...positionalLabel,
    ...positionalEncoding,
  })
  .describe('Interval mark: orthogonal interval product realized per bounds × coordinate (bar / histogram / heatmap cell / radial bar / pie-donut sector)');

export const ReferenceMarkSchema = z
  .object({
    type: z
      .literal(PlotMark.Reference)
      .describe('Discriminator: a constant-position reference mark (line for a single value, band for a [lo,hi] interval) spanning the opposite axis domain'),
    yTo: z
      .union([z.number(), z.string().min(1)])
      .optional()
      .describe('Horizontal band upper bound along y: number → constant, string → per-datum field. Present (paired with encoding.y as the lower bound) turns a horizontal reference into a filled band y∈[y,yTo]; omit → a single line'),
    xTo: z
      .union([z.number(), z.string().min(1)])
      .optional()
      .describe('Vertical band upper bound along x: number → constant, string → per-datum field. Present (paired with encoding.x as the lower bound) turns a vertical reference into a filled band x∈[x,xTo]; omit → a single line'),
    extentField: z
      .string()
      .min(1)
      .optional()
      .describe('Per-datum partial-length reference/band: field giving the span start along the opposite axis (omit → span the full opposite domain). Pairs with extentToField'),
    extentToField: z
      .string()
      .min(1)
      .optional()
      .describe('Per-datum partial-length reference/band: field giving the span end along the opposite axis (omit → span the full opposite domain). Pairs with extentField'),
    strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe('Reference line stroke width: field-bound datum channel or constant core Path stroke width'),
    opacity: PointOpacityStyleSchema.optional().describe('Reference mark whole opacity: field-bound datum channel or constant opacity 0..1'),
    fillOpacity: PointOpacityStyleSchema.optional().describe('Reference band fill opacity: field-bound datum channel or constant opacity 0..1'),
    ...coreNodeStyle,
    ...corePathStyle,
    ...markBase,
    ...positionalEncoding,
  })
  .describe('Reference mark: a constant-position reference constraint. Bind x (vertical) or y (horizontal); field → per-datum, value → constant. Give only the lower bound for a line; pair it with xTo / yTo for a filled band [lo,hi]. Use extentField / extentToField for partial-length spans');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, PathMarkSchema, IntervalMarkSchema, ReferenceMarkSchema])
  .describe('Mark union: 3 dimensional marks (point / path / interval) + reference marks');

export const CustomMarkSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .refine(type => !BUILTIN_MARK_TYPES.has(type), {
        message: 'custom mark type must not collide with a built-in mark type',
      })
      .describe('Discriminator: custom mark type; must be a non-empty, non-built-in identifier registered through options.markDefinitions'),
    encoding: EncodingSchema.optional().describe('Position / non-position channels; reuses the shared encoding so a custom mark contributes to scale inference like built-in marks'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'custom mark operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Custom mark operation: type is any non-built-in identifier; its config is validated at lowering time against the matching MarkDefinition supplied via options.markDefinitions');

export const MarkOperationSchema = z
  .union([MarkSchema, CustomMarkSchema])
  .describe('Mark operation union: built-in mark configs plus custom type passthrough operations validated by a runtime MarkDefinition');
