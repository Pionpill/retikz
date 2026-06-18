import { z } from 'zod';
import { PaintSpecSchema, type ValueOf } from '@retikz/core';
import { ChannelSchema, EncodingSchema, MarkLabelSchema, PointEncodingSchema, StyleEncodingSchema } from '../encoding';

/**
 * mark 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'point'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotMark.x)（不用 z.enum）。
 *   6 个抽象 mark = 4 个维度 mark（point / path / region / interval，描述数据在坐标空间的 k 维几何）
 *   + 2 个特殊 mark（link / reference，复用维度 mark 投影但语义不等同）。
 */
export const PlotMark = {
  /** 维度 mark / 0D：坐标元组上的实体 / glyph / 文本 anchor（散点 + 文本标签） */
  Point: 'point',
  /** 维度 mark / 1D：有序点连成的一维轨迹（折线 / 闭合轮廓） */
  Path: 'path',
  /** 维度 mark / 2D：边界围出的可填充区域（面积 / 填充雷达 / 置信带） */
  Region: 'region',
  /** 维度 mark / 区间积：各位置 role 正交区间积，经坐标系投影成段 / 矩形 / 扇区 / cell（柱 / histogram / heatmap / 径向柱 / 饼环） */
  Interval: 'interval',
  /** 特殊 mark / relation：source→target 关系几何（sankey / alluvial 流带） */
  Link: 'link',
  /** 特殊 mark / reference：固定位置 / 区间的参考约束（阈值线 / 容差带） */
  Reference: 'reference',
} as const;

/** mark 类型 */
export type PlotMarkValue = ValueOf<typeof PlotMark>;

/**
 * 流带主轴取向关键字（暴露给用户；裸 `'horizontal'` / `'vertical'` 同样可用）
 * @description 决定 link 的出 / 入切向与四角半宽方向：horizontal 出入沿 x（半宽沿 y），vertical 出入沿 y（半宽沿 x）。
 */
export const LinkOrientation = {
  /** 水平流：出 / 入切向沿 x，半宽沿 y（sankey 左右流） */
  Horizontal: 'horizontal',
  /** 竖直流：出 / 入切向沿 y，半宽沿 x（自上而下流） */
  Vertical: 'vertical',
} as const;

/** 流带主轴取向 */
export type LinkOrientationValue = ValueOf<typeof LinkOrientation>;

/**
 * interval 单维区间来源关键字（暴露给用户；裸 `'band'` 等同样可用）
 * @description interval 各位置 role 的区间 [lo,hi] 怎么来：band（band 宽）/ span（baseline→值）/ extent（两字段区间）/ full（满域）。
 */
export const IntervalBoundKind = {
  /** 中心取位置通道、宽取 band scale bandwidth；可选 group 字段把 band 切等分子带（分组柱 / dodge） */
  Band: 'band',
  /** baseline（默认 0）→ 位置通道值；经典柱高 / 径向柱 */
  Span: 'span',
  /** 两字段显式区间：histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end */
  Extent: 'extent',
  /** 满铺该 role 的坐标域（极坐标 inner→outer 半径；饼 / 环半径方向） */
  Full: 'full',
} as const;

/** interval 单维区间来源 */
export type IntervalBoundKindValue = ValueOf<typeof IntervalBoundKind>;

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

export const MarkValueKind = {
  /** 从数据字段解析视觉值 */
  Field: 'field',
  /** 直接使用常量视觉值 */
  Constant: 'constant',
} as const;

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
  .describe('Per-role interval bounds keyed by coordinate role (x / y / z)');

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

/** point mark（散点 + 文本标签） */
export type PointMark = z.infer<typeof PointMarkSchema>;
/** mark 值来源变体 */
export type MarkValueKindValue = ValueOf<typeof MarkValueKind>;
/** mark 样式值；需要 scale 的属性在此基础上交叉 `{ scale?: string }` */
export type MarkValueType<T> = { kind: 'field'; value: string } | { kind: 'constant'; value: T };
/** mark 样式值，字段变体可绑定 scale */
export type ScaledMarkValueType<T> = MarkValueType<T> & { scale?: string };
/** PointMark 颜色样式值（field / constant） */
export type PointColorStyle = z.infer<typeof PointColorStyleSchema>;
/** PointMark 尺寸样式值（field / constant） */
export type PointSizeStyle = z.infer<typeof PointSizeStyleSchema>;
/** PointMark 形状样式值（field / constant） */
export type PointShapeStyle = z.infer<typeof PointShapeStyleSchema>;
/** PointMark 填充样式值（field / constant） */
export type PointFillStyle = z.infer<typeof PointFillStyleSchema>;
/** PointMark 描边颜色样式值（field / constant） */
export type PointStrokeStyle = z.infer<typeof PointStrokeStyleSchema>;
/** PointMark 描边宽度样式值（field / constant） */
export type PointStrokeWidthStyle = z.infer<typeof PointNonnegativeNumberStyleSchema>;
/** PointMark 数值样式值（field / constant） */
export type PointNumberStyle = z.infer<typeof PointNumberStyleSchema>;
/** PointMark 非负数值样式值（field / constant） */
export type PointNonnegativeNumberStyle = z.infer<typeof PointNonnegativeNumberStyleSchema>;
/** PointMark 透明度样式值（field / constant） */
export type PointOpacityStyle = z.infer<typeof PointOpacityStyleSchema>;
/** PointMark zIndex 样式值（field / constant） */
export type PointZIndexStyle = z.infer<typeof PointZIndexStyleSchema>;
/** path mark（折线 / 轮廓） */
export type PathMark = z.infer<typeof PathMarkSchema>;
/** region mark（面积 / 填充雷达） */
export type RegionMark = z.infer<typeof RegionMarkSchema>;
/** interval 单维区间来源 */
export type IntervalBound = z.infer<typeof IntervalBoundSchema>;
/** interval per-role 区间来源 */
export type IntervalBounds = z.infer<typeof IntervalBoundsSchema>;
/** interval mark（柱 / histogram / heatmap / 径向柱 / 饼环） */
export type IntervalMark = z.infer<typeof IntervalMarkSchema>;
/** reference mark（参考线 / 阈值线 / 容差带） */
export type ReferenceMark = z.infer<typeof ReferenceMarkSchema>;
/** link 一端：字段对端点（经坐标系投影成屏幕点） */
export type LinkEndpoint = z.infer<typeof LinkEndpointSchema>;
/** link mark（sankey / alluvial 流带） */
export type LinkMark = z.infer<typeof LinkMarkSchema>;
/** mark（point / path / region / interval / reference / link） */
export type Mark = z.infer<typeof MarkSchema>;
