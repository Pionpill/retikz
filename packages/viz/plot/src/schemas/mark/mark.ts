import { JsonValueSchema, NonBlankStringSchema } from '@retikz/foundation';
import { discriminatedUnion, record, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { BuiltinPlotMark, markBase } from './base';
import { IntervalMarkSchema } from './interval';
import { PathMarkSchema } from './path';
import { PointMarkSchema } from './point';
import { RelationMarkSchema } from './relation';

/** 内置类型查询集合，仅供类型判断与自定义名称冲突校验使用 */
const builtinMarkTypes = new Set<string>(Object.values(BuiltinPlotMark));

/** 校验内置点、路径、区间与关系标记 */
export const MarkSchema = discriminatedUnion('type', [
  PointMarkSchema,
  PathMarkSchema,
  IntervalMarkSchema,
  RelationMarkSchema,
]).describe('Mark union: dimensional marks (point / path / interval) and source-target relation marks');

const CustomMarkObjectSchema = strictObject({
  ...markBase,
  type: NonBlankStringSchema.refine(type => !builtinMarkTypes.has(type), {
    message: 'custom mark type must not collide with a built-in mark type',
    abort: true,
  }),
  encodings: record(NonBlankStringSchema, JsonValueSchema).optional(),
  properties: record(NonBlankStringSchema, JsonValueSchema).optional(),
});

/** 校验自定义标记外壳，精确目标由注册定义校验 */
export const CustomMarkSchema = CustomMarkObjectSchema.describe(
  'Custom mark Source; registered definition validates its targets',
);

/** 校验内置或自定义标记操作 */
export const MarkOperationSchema = union([MarkSchema, CustomMarkSchema]).describe(
  'Built-in and registered custom mark configurations',
);

/** 内置数据图元声明 */
export type IRPlotMark = ZodInfer<typeof MarkSchema>;

/** custom mark operation（自定义 type 开放配置，由 runtime MarkDefinition 解释） */
export type IRPlotCustomMark = ZodInfer<typeof CustomMarkSchema>;

/** 图元声明：内置数据图元、独立标注与自定义配置 */
export type IRPlotMarkOperation = ZodInfer<typeof MarkOperationSchema>;

/** 判断是否为内置数据图元，独立标注使用独立实例分支 */
export const isBuiltinMark = (mark: IRPlotMarkOperation): mark is IRPlotMark => builtinMarkTypes.has(mark.type);
