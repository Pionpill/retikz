import { JsonObjectSchema, PaintSpecSchema } from '@retikz/core';
import { z } from 'zod';
import { ChannelSchema, EncodingSchema, MarkLabelSchema, PointEncodingSchema, StyleEncodingSchema } from '../encoding';
import { BUILTIN_MARK_TYPES, IntervalBoundKind, LinkOrientation, MarkValueKind, PlotMark } from './constants';

/** 各 mark 变体共享的基础字段（可选 id 句柄）；encoding 各 mark 自带（位置 mark 用 EncodingSchema、link / reference 用专属） */
const markBase = {
  id: z.string().min(1).optional().describe('Optional mark handle; reserved scope/anchor target'),
};

/** 位置 mark（point / path / region / interval）的 encoding：x / y 可选（必填性下放 coordinate 级校验）+ 样式 */
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
const StyleOpacitySchema = z.number().min(0).max(1);

export const PointFillStyleSchema = markValueSchema(StylePaintSchema, 'Data field path bound to point fill paint', 'Constant core Node fill paint', 'point fill style value');
export const PointColorStyleSchema = markValueSchema(z.string().min(1), 'Data field path bound to point color', 'Constant point color', 'point color value');
export const PointSizeStyleSchema = markValueSchema(StyleNonnegativeNumberSchema, 'Data field path bound to point size', 'Constant final glyph radius', 'point size value');
export const PointShapeStyleSchema = markValueSchema(z.string().min(1), 'Data field path bound to point shape', 'Constant core Node shape name', 'point shape value');
export const PointStrokeStyleSchema = markValueSchema(z.string().min(1), 'Data field path bound to point stroke color', 'Constant core Node stroke color', 'point stroke style value');
export const PointNumberStyleSchema = markValueSchema(StyleNumberSchema, 'Data field path bound to a numeric point style value', 'Constant numeric style value', 'point numeric style value');
export const PointNonnegativeNumberStyleSchema = markValueSchema(
  StyleNonnegativeNumberSchema,
  'Data field path bound to a non-negative point style value',
  'Constant non-negative style value',
  'point non-negative numeric style value',
);
export const PointOpacityStyleSchema = markValueSchema(StyleOpacitySchema, 'Data field path bound to an opacity style value', 'Constant opacity value 0..1', 'point opacity style value');
export const PointZIndexStyleSchema = markValueSchema(z.number().int().finite(), 'Data field path bound to zIndex', 'Constant integer zIndex value', 'point zIndex style value');

export const PointMarkSchema = z
  .object({
    type: z.literal(PlotMark.Point).describe('Discriminator: one glyph or text label per record'),
    color: PointColorStyleSchema.optional().describe('Glyph color: field-bound datum channel or constant color; overrides constant fill'),
    size: PointSizeStyleSchema.optional().describe('Glyph size: field-bound datum channel via a sqrt radius scale or constant final radius'),
    shape: PointShapeStyleSchema.optional().describe('Glyph shape: field-bound categorical channel or constant core Node shape name'),
    fill: PointFillStyleSchema.optional().describe('Glyph fill: field-bound datum channel or constant core Node fill paint'),
    stroke: PointStrokeStyleSchema.optional().describe('Glyph stroke color: field-bound datum channel or constant core Node stroke color'),
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
    ...markBase,
    ...positionalLabel,
    ...positionalEncoding,
  })
  .describe('Path mark: connects records in order into a 1D trajectory (line / radar outline)');

export const RegionMarkSchema = z
  .object({
    type: z.literal(PlotMark.Region).describe('Discriminator: a fillable 2D region between an upper outline and a baseline'),
    order: z.string().min(1).optional().describe('Data field driving connection order of the upper outline; omit for data array order'),
    series: z
      .string()
      .min(1)
      .optional()
      .describe('Series field: split records into one region per distinct value (multi-series); each series gets its own fill via the color scale'),
    baseline: z
      .number()
      .finite()
      .optional()
      .describe('Baseline value the region fills down to (the return edge runs along it); default 0. Finite-only to keep the IR JSON round-trippable'),
    closed: z
      .boolean()
      .optional()
      .describe('Connect the last point back to the first, closing the outline into a polygon; under polar this yields a filled radar. Default false'),
    ...markBase,
    ...positionalLabel,
    ...positionalEncoding,
  })
  .describe('Region mark: fillable 2D region between the value outline and a baseline (area chart / filled radar / confidence band)');

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

const FullBoundSchema = z
  .object({
    kind: z.literal(IntervalBoundKind.Full).describe('Full bound: span the whole coordinate domain of this role'),
  })
  .describe('Full bound: spans the role coordinate domain (pie / donut radius, inner→outer)');

export const IntervalBoundSchema = z
  .discriminatedUnion('kind', [BandBoundSchema, SpanBoundSchema, ExtentBoundSchema, FullBoundSchema])
  .describe('Single-role interval bound source: band / span / extent / full');

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
    ...markBase,
    ...positionalEncoding,
  })
  .describe('Reference mark: a constant-position reference constraint. Bind x (vertical) or y (horizontal); field → per-datum, value → constant. Give only the lower bound for a line; pair it with xTo / yTo for a filled band [lo,hi]. Use extentField / extentToField for partial-length spans');

export const LinkEndpointSchema = z
  .object({
    x: ChannelSchema.describe('Field-pair endpoint primary position channel (projected through the coordinate system)'),
    y: ChannelSchema.describe('Field-pair endpoint secondary position channel (projected through the coordinate system)'),
  })
  .describe('One link endpoint: an { x, y } field pair projected through the coordinate system into a screen point');

export const LinkMarkSchema = z
  .object({
    type: z.literal(PlotMark.Link).describe('Discriminator: a fillable cubic flow band between two endpoint sets'),
    source: LinkEndpointSchema.describe('Source endpoint (the band start, projected to a screen point)'),
    target: LinkEndpointSchema.describe('Target endpoint (the band end, projected to a screen point)'),
    value: z.string().min(1).describe('Flow magnitude field; mapped through a width scale to the source-end band width (user units)'),
    width: z
      .string()
      .min(1)
      .optional()
      .describe('Optional independent width-scale name; omitted → a default linear scale is synthesized from the value extent'),
    endWidth: z
      .string()
      .min(1)
      .optional()
      .describe('Optional target-end width field; omitted → equal width to the source end (a straight-width band rather than a flared one)'),
    curvature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Cubic control-point extrapolation ratio along the main axis (0 = near-straight, larger = more S-shaped); default 0.5'),
    orientation: z
      .enum(LinkOrientation)
      .optional()
      .describe('Main-axis orientation; the entry / exit tangents run along this axis and the band half-width is taken along the perpendicular axis (horizontal → flow left-right, vertical → flow top-down); default horizontal'),
    ...markBase,
    encoding: StyleEncodingSchema,
  })
  .describe('Link mark: one fillable cubic band per record between a source and target field-pair endpoint, width driven by the value field; consumes pre-computed layout positions (sankey / alluvial layout is out of scope). Uses style-only encoding (color)');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, PathMarkSchema, RegionMarkSchema, IntervalMarkSchema, ReferenceMarkSchema, LinkMarkSchema])
  .describe('Mark union: 4 dimensional marks (point / path / region / interval) + 2 special marks (link / reference)');

export const CustomMarkSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .refine(type => !BUILTIN_MARK_TYPES.has(type), {
        message: 'custom mark type must not collide with a built-in mark type',
      })
      .describe('Discriminator: custom mark type; must be a non-empty, non-built-in identifier registered through options.markDefinitions'),
    encoding: EncodingSchema.optional().describe('Position / visual channels; reuses the shared encoding so a custom mark contributes to scale inference like built-in marks'),
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
