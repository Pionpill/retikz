import { discriminatedUnion } from 'zod';
import type { ZodType, input as ZodInput, infer as ZodInfer } from 'zod';

import { IntervalMarkSchema } from './interval';
import { PathMarkSchema } from './path';
import { PointMarkSchema } from './point';
import { RelationMarkSchema } from './relation';

/** 校验内置点、路径、区间与关系标记 */
const markSchema = discriminatedUnion('type', [
  PointMarkSchema,
  PathMarkSchema,
  IntervalMarkSchema,
  RelationMarkSchema,
]).describe('Mark union: dimensional marks (point / path / interval) and source-target relation marks');

/** Plot 图元声明 */
export type IRPlotMark = ZodInfer<typeof markSchema>;

/** 图元的公开解析契约，避免将内部 schema 组合展开到整个 Plot 声明 */
export const MarkSchema: ZodType<IRPlotMark, ZodInput<typeof markSchema>> = markSchema;
