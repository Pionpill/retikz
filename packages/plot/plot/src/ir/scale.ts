import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * scale 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'linear'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotScale.x)（不用 z.enum）；后续加 ordinal / time…
 */
export const PlotScale = {
  /** 连续线性映射 */
  Linear: 'linear',
  /** 分类带：每个类别占一段等宽 band（柱状图 x 轴） */
  Band: 'band',
  /** 分类点：band 的退化，类别落在等距点上（分类轴上的折线 / 散点） */
  Point: 'point',
  /** 序数：分类域 → 离散输出域（典型为颜色），多系列着色主力 */
  Ordinal: 'ordinal',
  /** 时间：连续时间映射（epoch 毫秒），刻度落人类可读时间边界（UTC） */
  Time: 'time',
  /** 对数：连续对数映射；domain / value 必须全正（0 与负值不可绘，lowering 跳过 / 拒绝） */
  Log: 'log',
  /** 幂：连续幂映射 y = m·x^exponent + b */
  Pow: 'pow',
  /** 平方根：pow exponent 0.5 的常用别名（面积感知正确；size 通道默认派生到此）；domain / value 必须 ≥ 0 */
  Sqrt: 'sqrt',
  /** 连续顺序色阶：单调量 domain → 单方向色带（低→高），continuous / temporal color 主力 */
  Sequential: 'sequential',
  /** 连续发散色阶：有中点的量 domain → 两侧异色色带（中点淡），盈亏 / 偏离均值 */
  Diverging: 'diverging',
  /** 等宽离散化：连续 domain 等宽切 count 段 → 离散 color 档（choropleth / 均匀分布连续量） */
  Quantize: 'quantize',
  /** 阈值离散化：用户自定义断点切档 → 离散 color 档（断点须升序，色数 = 断点数 + 1；业务阈值 / 告警） */
  Threshold: 'threshold',
  /** 分位离散化：按数据分位切 count 档（每档样本数约等）→ 离散 color 档（偏斜数据 / 抗离群） */
  Quantile: 'quantile',
} as const;

/** scale 类型 */
export type PlotScaleValue = ValueOf<typeof PlotScale>;

/**
 * 命名配色方案词表（暴露给用户；成员值即 IR 判别串，裸字面量 `'viridis'` 同样可用）
 * @description 闭枚举进 IR，取 d3-scale-chromatic 子集；sequential 系单 / 多色相 + diverging 系两侧异色，
 *   lowering 经对应 interpolator 求值。不把 interpolator 函数塞进 IR（IR 须 100% JSON 可序列化）。
 */
export const PlotColorScheme = {
  /** sequential 单色相蓝 */
  Blues: 'blues',
  /** sequential 单色相绿 */
  Greens: 'greens',
  /** sequential 单色相灰 */
  Greys: 'greys',
  /** sequential 单色相橙 */
  Oranges: 'oranges',
  /** sequential 单色相紫 */
  Purples: 'purples',
  /** sequential 单色相红 */
  Reds: 'reds',
  /** sequential 多色相（感知均匀、色盲友好；sequential 默认） */
  Viridis: 'viridis',
  /** sequential 多色相 magma */
  Magma: 'magma',
  /** sequential 多色相 inferno */
  Inferno: 'inferno',
  /** sequential 多色相 plasma */
  Plasma: 'plasma',
  /** sequential 多色相 cividis（色盲友好） */
  Cividis: 'cividis',
  /** sequential 多色相 turbo */
  Turbo: 'turbo',
  /** diverging 棕—蓝绿 */
  BrBG: 'brbg',
  /** diverging 紫红—绿 */
  PRGn: 'prgn',
  /** diverging 粉红—黄绿 */
  PiYG: 'piyg',
  /** diverging 紫—橙 */
  PuOr: 'puor',
  /** diverging 红—蓝（diverging 默认） */
  RdBu: 'rdbu',
  /** diverging 红—灰 */
  RdGy: 'rdgy',
  /** diverging 红—黄—蓝 */
  RdYlBu: 'rdylbu',
  /** diverging 红—黄—绿 */
  RdYlGn: 'rdylgn',
  /** diverging 光谱（红—橙—黄—绿—蓝） */
  Spectral: 'spectral',
} as const;

/** 配色方案名 */
export type PlotColorSchemeValue = ValueOf<typeof PlotColorScheme>;

/** 分类标量：类别取值（字符串或数值；不含 boolean / null） */
export const CategoryValueSchema = z
  .union([z.string(), z.number()])
  .describe('A category value: string or number (the leaf a band / point scale domain element resolves to)');

export const LinearScaleSchema = z
  .object({
    type: z.literal(PlotScale.Linear).describe('Discriminator: continuous linear scale'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[min, max] input extent; omit to infer from the bound dataset fields at lowering'),
    range: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
    nice: z.boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  })
  .describe('Linear scale: a continuous numeric mapping from domain to range');

export const BandScaleSchema = z
  .object({
    type: z.literal(PlotScale.Band).describe('Discriminator: categorical band scale; each category occupies one equal-width band'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .array(CategoryValueSchema)
      .optional()
      .describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
    paddingInner: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Gap between adjacent bands as a fraction of step, 0..1; default 0.1'),
    paddingOuter: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Gap before the first and after the last band as a fraction of step, 0..1; default = paddingInner'),
    align: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('How outer padding is distributed around the bands, 0..1; default 0.5 (centered)'),
  })
  .describe('Band scale: maps a discrete category set to equal-width bands across the range');

export const PointScaleSchema = z
  .object({
    type: z.literal(PlotScale.Point).describe('Discriminator: categorical point scale; categories land on evenly spaced points (zero bandwidth)'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .array(CategoryValueSchema)
      .optional()
      .describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
    padding: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Outer padding as a fraction of step, 0..1; default 0.5'),
    align: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('How padding is distributed, 0..1; default 0.5 (centered)'),
  })
  .describe('Point scale: degenerate band (zero width) placing categories on evenly spaced positions');

export const OrdinalScaleSchema = z
  .object({
    type: z.literal(PlotScale.Ordinal).describe('Discriminator: ordinal scale mapping a discrete domain to a discrete output range (typically colors)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional channel scale ref'),
    domain: z
      .array(CategoryValueSchema)
      .optional()
      .describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
    range: z
      .array(z.string())
      .optional()
      .describe('Output values cycled across the domain (e.g. color strings); omit to use a default categorical color scheme'),
  })
  .describe('Ordinal scale: discrete domain to discrete output range (colors); the workhorse for series color');

export const TimeScaleSchema = z
  .object({
    type: z.literal(PlotScale.Time).describe('Discriminator: continuous time scale over epoch-millisecond instants'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[startMs, endMs] epoch-millisecond extent; omit to infer from the bound field timestamps at lowering. Dates never enter the IR — only millisecond numbers'),
    nice: z.boolean().optional().describe('Round the domain outward to nice time boundaries (day / month / year); default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain instants to the range ends; default false'),
  })
  .describe('Time scale: continuous mapping from time instants (epoch ms) to range; ticks land on human-readable time boundaries');

export const LogScaleSchema = z
  .object({
    type: z.literal(PlotScale.Log).describe('Discriminator: continuous logarithmic scale (domain must be strictly positive)'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[min, max] input extent, both strictly > 0; omit to infer from the positive field values at lowering. Non-positive bounds are rejected at lowering'),
    range: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
    base: z.number().gt(1).optional().describe('Logarithm base; default 10'),
    nice: z.boolean().optional().describe('Round the domain outward to nice powers of the base; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  })
  .describe('Log scale: continuous logarithmic mapping; valid only on point / line marks (interval / area baseline includes 0)');

export const PowScaleSchema = z
  .object({
    type: z.literal(PlotScale.Pow).describe('Discriminator: continuous power scale'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[min, max] input extent; omit to infer from the field values at lowering. A non-integer exponent requires a non-negative domain (rejected at lowering otherwise)'),
    range: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
    exponent: z.number().optional().describe('Power exponent; default 2'),
    nice: z.boolean().optional().describe('Round the domain to nice numbers; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  })
  .describe('Pow scale: continuous power mapping y = m·x^exponent + b; valid only on point / line marks');

export const SqrtScaleSchema = z
  .object({
    type: z.literal(PlotScale.Sqrt).describe('Discriminator: continuous square-root scale (pow with exponent 0.5; area-perceptual)'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y or a size channel'),
    domain: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[min, max] input extent, both ≥ 0; omit to infer from the field values at lowering. Negative bounds are rejected at lowering'),
    range: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[start, end] output extent in plot-area units (or px radius for a size channel); omit to derive at lowering'),
    nice: z.boolean().optional().describe('Round the domain to nice numbers; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  })
  .describe('Sqrt scale: continuous square-root mapping (area-perceptual); valid only on point / line marks; also the default derivation target for the size channel');

export const SequentialColorScaleSchema = z
  .object({
    type: z.literal(PlotScale.Sequential).describe('Discriminator: continuous sequential color scale (monotone quantity to a one-directional color band)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional color channel scale ref'),
    domain: z
      .tuple([z.number().finite(), z.number().finite()])
      .optional()
      .describe('[min, max] input extent; omit to infer from the bound color field at lowering. Endpoints must be finite; min must be < max (rejected at lowering otherwise); temporal fields use a timestamp extent'),
    scheme: z
      .enum(PlotColorScheme)
      .optional()
      .describe('Named color scheme to interpolate across the domain; omit to default to viridis at lowering. Overridden by range when both are given'),
    range: z
      .tuple([z.string(), z.string()])
      .optional()
      .describe('[low, high] endpoint colors that override scheme; omit to derive endpoints from the named scheme at lowering'),
    nice: z.boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the color band ends; default false'),
  })
  .describe('Sequential color scale: a continuous monotone domain mapped to a one-directional color band; the workhorse for continuous / temporal color');

export const DivergingColorScaleSchema = z
  .object({
    type: z.literal(PlotScale.Diverging).describe('Discriminator: continuous diverging color scale (a quantity with a meaningful midpoint to a two-sided color band)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional color channel scale ref'),
    domain: z
      .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
      .optional()
      .describe('[low, mid, high] input extent around a meaningful midpoint; omit to infer [min, (min+max)/2, max] from the bound field at lowering. Endpoints must be finite; must satisfy low < mid < high (rejected at lowering otherwise)'),
    scheme: z
      .enum(PlotColorScheme)
      .optional()
      .describe('Named diverging color scheme to interpolate around the midpoint; omit to default to rdbu at lowering. Overridden by range when both are given'),
    range: z
      .tuple([z.string(), z.string(), z.string()])
      .optional()
      .describe('[low, mid, high] colors that override scheme; omit to derive the two-sided band from the named scheme at lowering'),
    nice: z.boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the color band ends; default false'),
  })
  .describe('Diverging color scale: a continuous domain with a meaningful midpoint mapped to a two-sided color band (distinct hues either side, pale center); for profit / loss or deviation-from-mean quantities');

export const QuantizeColorScaleSchema = z
  .object({
    type: z.literal(PlotScale.Quantize).describe('Discriminator: quantize color scale (a continuous domain cut into equal-width bins, each bin a discrete color)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional color channel scale ref'),
    domain: z
      .tuple([z.number().finite(), z.number().finite()])
      .optional()
      .describe('[min, max] input extent cut into equal-width bins; omit to infer [min, max] from the bound color field at lowering. Endpoints must be finite'),
    count: z
      .number()
      .int()
      .min(2)
      .optional()
      .describe('Number of equal-width bins; omit to default to 5 at lowering. When range is given, the bin count is range.length; if count is also given it must equal range.length, otherwise lowering fails loud'),
    scheme: z
      .enum(PlotColorScheme)
      .optional()
      .describe('Named color scheme sampled at count evenly spaced points to produce the discrete bin colors; omit to default to viridis at lowering. Overridden by range when both are given'),
    range: z
      .array(z.string())
      .min(2)
      .optional()
      .describe('Explicit discrete bin colors that override scheme; the array length is the bin count'),
  })
  .describe('Quantize color scale: a continuous domain cut into equal-width bins, each bin mapped to one discrete color sampled from a scheme or taken from range');

export const ThresholdColorScaleSchema = z
  .object({
    type: z.literal(PlotScale.Threshold).describe('Discriminator: threshold color scale (user-defined breakpoints cut the domain into bins, each bin a discrete color)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional color channel scale ref'),
    breakpoints: z
      .array(z.number().finite())
      .min(1)
      .describe('Strictly ascending finite breakpoints cutting the value range into breakpoints.length + 1 bins; required (a threshold scale has no default cut points). Ascending order is enforced at lowering'),
    scheme: z
      .enum(PlotColorScheme)
      .optional()
      .describe('Named color scheme sampled at breakpoints.length + 1 evenly spaced points to produce the discrete bin colors; omit to default to viridis at lowering. Overridden by range when both are given'),
    range: z
      .array(z.string())
      .min(2)
      .optional()
      .describe('Explicit discrete bin colors that override scheme; length must equal breakpoints.length + 1 (enforced at lowering)'),
  })
  .describe('Threshold color scale: user-defined ascending breakpoints cut the domain into bins, each bin mapped to one discrete color sampled from a scheme or taken from range');

export const QuantileColorScaleSchema = z
  .object({
    type: z.literal(PlotScale.Quantile).describe('Discriminator: quantile color scale (the data is cut at quantiles into bins of roughly equal sample count, each bin a discrete color)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional color channel scale ref'),
    count: z
      .number()
      .int()
      .min(2)
      .optional()
      .describe('Number of quantile bins; omit to default to 5 at lowering. When range is given, the bin count is range.length; if count is also given it must equal range.length, otherwise lowering fails loud'),
    scheme: z
      .enum(PlotColorScheme)
      .optional()
      .describe('Named color scheme sampled at count evenly spaced points to produce the discrete bin colors; omit to default to viridis at lowering. Overridden by range when both are given'),
    range: z
      .array(z.string())
      .min(2)
      .optional()
      .describe('Explicit discrete bin colors that override scheme; the array length is the bin count'),
  })
  .describe('Quantile color scale: the bound data is cut at quantiles into bins of roughly equal sample count, each bin mapped to one discrete color; the quantile boundaries come from the data, so this scale takes no explicit numeric domain');

export const ScaleSchema = z
  .discriminatedUnion('type', [
    LinearScaleSchema,
    BandScaleSchema,
    PointScaleSchema,
    OrdinalScaleSchema,
    TimeScaleSchema,
    LogScaleSchema,
    PowScaleSchema,
    SqrtScaleSchema,
    SequentialColorScaleSchema,
    DivergingColorScaleSchema,
    QuantizeColorScaleSchema,
    ThresholdColorScaleSchema,
    QuantileColorScaleSchema,
  ])
  .describe('Scale union: linear / band / point / ordinal / time / log / pow / sqrt / sequential / diverging / quantize / threshold / quantile');

/** 分类标量：类别取值 */
export type CategoryValue = z.infer<typeof CategoryValueSchema>;
/** 线性 scale */
export type LinearScale = z.infer<typeof LinearScaleSchema>;
/** band scale */
export type BandScale = z.infer<typeof BandScaleSchema>;
/** point scale */
export type PointScale = z.infer<typeof PointScaleSchema>;
/** ordinal scale（分类 → 离散输出，颜色） */
export type OrdinalScale = z.infer<typeof OrdinalScaleSchema>;
/** time scale（连续时间，epoch ms） */
export type TimeScale = z.infer<typeof TimeScaleSchema>;
/** log scale（连续对数，domain 全正） */
export type LogScale = z.infer<typeof LogScaleSchema>;
/** pow scale（连续幂） */
export type PowScale = z.infer<typeof PowScaleSchema>;
/** sqrt scale（连续平方根，面积感知；size 通道默认派生目标） */
export type SqrtScale = z.infer<typeof SqrtScaleSchema>;
/** sequential color scale（连续顺序色阶；continuous / temporal color 主力） */
export type SequentialColorScale = z.infer<typeof SequentialColorScaleSchema>;
/** diverging color scale（连续发散色阶；有中点的量两侧异色） */
export type DivergingColorScale = z.infer<typeof DivergingColorScaleSchema>;
/** quantize color scale（等宽离散化；连续 domain 等宽切档 → 离散色） */
export type QuantizeColorScale = z.infer<typeof QuantizeColorScaleSchema>;
/** threshold color scale（阈值离散化；自定义升序断点切档 → 离散色） */
export type ThresholdColorScale = z.infer<typeof ThresholdColorScaleSchema>;
/** quantile color scale（分位离散化；按数据分位切档 → 离散色，无显式数值 domain） */
export type QuantileColorScale = z.infer<typeof QuantileColorScaleSchema>;
/** scale（linear / band / point / ordinal / time / log / pow / sqrt / sequential / diverging / quantize / threshold / quantile） */
export type Scale = z.infer<typeof ScaleSchema>;
