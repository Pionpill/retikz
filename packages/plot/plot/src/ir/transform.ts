import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * transform 类型关键字（暴露给用户；裸 `'sort'` / `'stack'` 同样可用）
 * @description 数据变换 op 的判别字段，成员里写 z.literal(PlotTransform.x)；后续加 filter / aggregate / bin…
 */
export const PlotTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 堆叠：每个 x 分组内按系列累加，派生 [y0, y1] */
  Stack: 'stack',
} as const;

/** transform 类型 */
export type TransformType = ValueOf<typeof PlotTransform>;

export const SortTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Sort).describe('Discriminator: reorder rows by a field'),
    field: z.string().min(1).describe('Field path the rows are ordered by'),
    order: z
      .enum(['ascending', 'descending'])
      .optional()
      .describe('Sort direction; default ascending'),
  })
  .describe('Sort transform: stable reorder of the data rows by one field');

export const StackTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Stack).describe('Discriminator: cumulative stacking within each x group'),
    x: z
      .string()
      .min(1)
      .optional()
      .describe('Grouping key field: rows sharing this value stack together (the categorical axis field); omit to accumulate all rows into a single cumulative chain (e.g. pie wedges)'),
    y: z.string().min(1).describe('Numeric value field that is accumulated within each x group'),
    groupBy: z
      .string()
      .min(1)
      .optional()
      .describe('Series field ordering segments within each stack (one segment per distinct value); omit to accumulate in data row order'),
    startField: z.string().min(1).optional().describe('Output field for the lower bound of each segment; default "y0"'),
    endField: z.string().min(1).optional().describe('Output field for the upper bound of each segment; default "y1"'),
  })
  .describe('Stack transform: within each x group, accumulate y across series and derive [start, end] bounds per row');

export const TransformSchema = z
  .discriminatedUnion('kind', [SortTransformSchema, StackTransformSchema])
  .describe('Data transform op applied before scale / mark; ordered pipeline. First batch: sort / stack');

/** sort transform */
export type SortTransform = z.infer<typeof SortTransformSchema>;
/** stack transform */
export type StackTransform = z.infer<typeof StackTransformSchema>;
/** transform op（sort / stack） */
export type Transform = z.infer<typeof TransformSchema>;
