import type { ValueOf } from '@retikz/foundation';
import {
  createOpenStringSchema,
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
} from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { array, discriminatedUnion, literal, looseObject, strictObject, union, enum as zodEnum } from 'zod';

import { OrderBySchema } from '../../order';

/** 内置 row selector operation kind 关键字 */
export const BuiltinSelectorOperationKind = {
  /** 选择排序字段最小的行 */
  Min: 'min',
  /** 选择排序字段最大的行 */
  Max: 'max',
  /** 选择当前顺序或显式排序后的第一行 */
  First: 'first',
  /** 选择当前顺序或显式排序后的最后一行 */
  Last: 'last',
  /** 选择排序字段最高名次的行 */
  Top: 'top',
  /** 选择排序字段最低名次的行 */
  Bottom: 'bottom',
  /** 选择排序后的第 n 行 */
  Nth: 'nth',
  /** 选择落在分位区间之外的原始行 */
  OutsideQuantileBand: 'outside-quantile-band',
} as const;

/** row selector 平局处理策略 */
export const RowSelectorTie = {
  /** 平局时只保留第一行 */
  First: 'first',
  /** 平局时只保留最后一行 */
  Last: 'last',
  /** 平局时保留所有命中的行 */
  All: 'all',
} as const;

/** row selector operation 保留 kind 集合；供 external 开放配置排除内置判别串 */
const RESERVED_SELECTOR_OPERATION_KINDS: ReadonlySet<string> = new Set(Object.values(BuiltinSelectorOperationKind));

/** 内置 row selector operation kind 取值 */
export type BuiltinSelectorOperationKind = ValueOf<typeof BuiltinSelectorOperationKind>;

/** row selector 平局处理策略值 */
export type RowSelectorTie = ValueOf<typeof RowSelectorTie>;

/** 创建一个按数值字段选极值行的 selector operation schema */
const createMinMaxSelectorOperationSchema = <TKind extends string>(kind: TKind) =>
  strictObject({
    kind: literal(kind).describe('Discriminator: min/max row selector'),
    by: NonBlankStringSchema.describe('Numeric ranking field'),
    tie: zodEnum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
  }).describe('Min/max row selector operation');

/** 创建一个按输入顺序或显式 orderBy 取首尾行的 selector operation schema */
const createFirstLastSelectorOperationSchema = <TKind extends string>(kind: TKind) =>
  strictObject({
    kind: literal(kind).describe('Discriminator: first/last row selector'),
    orderBy: array(OrderBySchema).min(1).optional().describe('Ordering before selection; omitted keeps current order'),
  }).describe('First/last row selector operation');

/** 创建一个按数值字段排名并选择 N 行的 selector operation schema */
const createTopBottomSelectorOperationSchema = <TKind extends string>(kind: TKind) =>
  strictObject({
    kind: literal(kind).describe('Discriminator: top/bottom row selector'),
    by: NonBlankStringSchema.describe('Numeric ranking field'),
    n: PositiveIntegerSchema.describe('Selected row count'),
    tie: zodEnum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
  }).describe('Top/bottom row selector operation');

/** nth selector operation schema；按显式 orderBy 选择零基下标行 */
const NthSelectorOperationSchema = strictObject({
  kind: literal(BuiltinSelectorOperationKind.Nth).describe('Discriminator: nth row selector'),
  orderBy: array(OrderBySchema).min(1).describe('Ordering before selection'),
  index: NonNegativeIntegerSchema.describe('Zero-based row index'),
}).describe('Nth row selector operation');

/** outside-quantile-band selector 边界策略 schema */
export const OutsideQuantileBandBoundarySchema = discriminatedUnion('kind', [
  strictObject({
    kind: literal('band').describe('Discriminator: quantile band boundaries'),
  }).describe('Quantile band boundary strategy'),
  strictObject({
    kind: literal('spread').describe('Discriminator: spread fences'),
    factor: NonNegativeNumberSchema.optional().describe('Spread multiplier; default 1.5'),
  }).describe('Spread fence boundary strategy'),
]).describe('Outside quantile-band boundary strategy');

/** outside-quantile-band selector operation schema；选择分位区间或 spread fence 外的原始行 */
export const OutsideQuantileBandSelectorOperationSchema = strictObject({
  kind: literal(BuiltinSelectorOperationKind.OutsideQuantileBand).describe('Discriminator: outside-band selector'),
  field: NonBlankStringSchema.describe('Numeric source field'),
  lowerP: NormalizedFractionSchema.describe('Lower quantile probability'),
  upperP: NormalizedFractionSchema.describe('Upper quantile probability'),
  boundary: OutsideQuantileBandBoundarySchema.optional().describe('Boundary strategy; default band'),
})
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Outside quantile-band row selector operation');

/** 内置 selector operation 的 schema 单一真源；aggregate schema 与 provider definition 共用这些实例 */
export const BUILTIN_SELECTOR_OPERATION_SCHEMAS = Object.freeze({
  Min: createMinMaxSelectorOperationSchema(BuiltinSelectorOperationKind.Min),
  Max: createMinMaxSelectorOperationSchema(BuiltinSelectorOperationKind.Max),
  First: createFirstLastSelectorOperationSchema(BuiltinSelectorOperationKind.First),
  Last: createFirstLastSelectorOperationSchema(BuiltinSelectorOperationKind.Last),
  Top: createTopBottomSelectorOperationSchema(BuiltinSelectorOperationKind.Top),
  Bottom: createTopBottomSelectorOperationSchema(BuiltinSelectorOperationKind.Bottom),
  Nth: NthSelectorOperationSchema,
  OutsideQuantileBand: OutsideQuantileBandSelectorOperationSchema,
});

/** 外部 row selector operation schema；只校验 JSON 形态和非内置 kind，具体契约由运行时 definition 提供 */
const ExternalSelectorOperationObjectSchema = looseObject({
  kind: createOpenStringSchema(BuiltinSelectorOperationKind)
    .refine(operationKind => !RESERVED_SELECTOR_OPERATION_KINDS.has(operationKind), {
      message: 'external selector kind must not collide with a built-in selector kind',
    })
    .describe('Discriminator: custom selector kind'),
});

/** 校验带 JSON 配置的自定义数据选择操作 */
const ExternalSelectorOperationSchema = ExternalSelectorOperationObjectSchema.catchall(JsonValueSchema).describe(
  'Custom selector operation with JSON config',
);

/** 内置 row selector operation schema */
const BuiltinSelectorOperationSchema = union([
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.Min,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.Max,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.First,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.Last,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.Top,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.Bottom,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.Nth,
  BUILTIN_SELECTOR_OPERATION_SCHEMAS.OutsideQuantileBand,
]).describe('Built-in row selector operation');

/** row selector operation schema；包含内置 kind 与外部注册 kind 开放配置对象 */
export const SelectorOperationSchema = union([
  BuiltinSelectorOperationSchema,
  ExternalSelectorOperationSchema,
]).describe('Built-in or custom row selector operation');

/** row selector operation（代表行选择子算子） */
export type IRDataSelectorOperation = ZodInfer<typeof SelectorOperationSchema>;

/** outside-quantile-band selector operation（分位区间外原始行选择） */
export type IRDataOutsideQuantileBandSelectorOperation = ZodInfer<typeof OutsideQuantileBandSelectorOperationSchema>;
