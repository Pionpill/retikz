import type { z } from 'zod';
import type { AggregateTransformSchema, BinTransformSchema, CustomTransformSchema, DeriveIntervalTransformSchema, JitterTransformSchema, NormalizeTransformSchema, SortTransformSchema, StackTransformSchema, TransformOperationSchema, TransformSchema } from './schema';

/** sort transform */
export type SortTransform = z.infer<typeof SortTransformSchema>;
/** stack transform */
export type StackTransform = z.infer<typeof StackTransformSchema>;
/** bin transform（连续分箱，改行数） */
export type BinTransform = z.infer<typeof BinTransformSchema>;
/** aggregate transform（分组聚合，改行数） */
export type AggregateTransform = z.infer<typeof AggregateTransformSchema>;
/** normalize transform（组内百分比归一化，保行数） */
export type NormalizeTransform = z.infer<typeof NormalizeTransformSchema>;
/** derive-interval transform（单行派生区间，保行数） */
export type DeriveIntervalTransform = z.infer<typeof DeriveIntervalTransformSchema>;
/** jitter transform（确定性位置抖动，保行数） */
export type JitterTransform = z.infer<typeof JitterTransformSchema>;
/** 内置 transform operation（sort / stack / bin / aggregate / normalize / derive-interval / jitter） */
export type Transform = z.infer<typeof TransformSchema>;
/** transform operation（内置 ∪ 自定义 kind passthrough） */
export type TransformOperation = z.infer<typeof TransformOperationSchema>;
/** 自定义 transform operation（运行时由 TransformDefinition 精确校验并执行） */
export type CustomTransform = z.infer<typeof CustomTransformSchema>;
