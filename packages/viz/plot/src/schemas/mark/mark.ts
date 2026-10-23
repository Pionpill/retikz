import { discriminatedUnion } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { IntervalMarkSchema } from './interval';
import { PathMarkSchema } from './path';
import { PointMarkSchema } from './point';
import { RelationMarkSchema } from './relation';

/** 校验内置点、路径、区间与关系标记 */
export const MarkSchema = discriminatedUnion('type', [
  PointMarkSchema,
  PathMarkSchema,
  IntervalMarkSchema,
  RelationMarkSchema,
]).describe('Mark union: dimensional marks (point / path / interval) and source-target relation marks');

/** Plot 图元声明 */
export type IRPlotMark = ZodInfer<typeof MarkSchema>;
