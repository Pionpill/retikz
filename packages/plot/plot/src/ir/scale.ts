import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * scale 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'linear'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotScale.x)（不用 nativeEnum）；后续加 ordinal / time…
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
} as const;

/** scale 类型 */
export type ScaleType = ValueOf<typeof PlotScale>;

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

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema, BandScaleSchema, PointScaleSchema, OrdinalScaleSchema, TimeScaleSchema, LogScaleSchema, PowScaleSchema, SqrtScaleSchema])
  .describe('Scale union: linear / band / point / ordinal / time / log / pow / sqrt');

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
/** scale（linear / band / point / ordinal / time / log / pow / sqrt） */
export type Scale = z.infer<typeof ScaleSchema>;
