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

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema, BandScaleSchema, PointScaleSchema])
  .describe('Scale union: linear (continuous) / band / point (categorical); extensible to ordinal / time in later ADRs');

/** 分类标量：类别取值 */
export type CategoryValue = z.infer<typeof CategoryValueSchema>;
/** 线性 scale */
export type LinearScale = z.infer<typeof LinearScaleSchema>;
/** band scale */
export type BandScale = z.infer<typeof BandScaleSchema>;
/** point scale */
export type PointScale = z.infer<typeof PointScaleSchema>;
/** scale（linear / band / point） */
export type Scale = z.infer<typeof ScaleSchema>;
