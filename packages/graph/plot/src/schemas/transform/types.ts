import type { z } from 'zod';
import type {
  AggregateTransformSchema,
  BinTransformSchema,
  BuiltinTransformSchema,
  DeriveIntervalTransformSchema,
  DeriveRelationTransformSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  RelationEndpointSelectorSchema,
  RelationMeasureSchema,
  SortTransformSchema,
  StackTransformSchema,
  TransformSchema,
} from './schema';

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
/** relation endpoint selector（每组选择 source / target 行） */
export type RelationEndpointSelector = z.infer<typeof RelationEndpointSelectorSchema>;
/** relation measure（从 source / target 行派生差值等字段） */
export type RelationMeasure = z.infer<typeof RelationMeasureSchema>;
/** derive-relation transform（从数据动态派生 relation rows） */
export type DeriveRelationTransform = z.infer<typeof DeriveRelationTransformSchema>;
/** jitter transform（确定性位置抖动，保行数） */
export type JitterTransform = z.infer<typeof JitterTransformSchema>;
/** 内置 transform operation（sort / stack / bin / aggregate / normalize / derive-interval / derive-relation / jitter） */
export type BuiltinTransform = z.infer<typeof BuiltinTransformSchema>;
/** transform operation（内置 ∪ 外部注册 kind passthrough） */
export type Transform = z.infer<typeof TransformSchema>;
/** transform pipeline operation；definition 运行时用 schema 精确收窄。 */
export type TransformOperation = Transform;
