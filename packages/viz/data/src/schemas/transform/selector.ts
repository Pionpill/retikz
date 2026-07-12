import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { DataSortOrder, RESERVED_SELECTOR_OPERATION_KINDS, RowSelectorTie, SelectorOperationKind } from './constants';

/** row selector 排序规则 schema；用于 first / last / nth 等代表行选择。 */
export const OrderBySchema = z
  .strictObject({
    field: z.string().min(1).describe('Order field'),
    order: z.enum(DataSortOrder).optional().describe('Sort direction; default ascending'),
  })
  .describe('Row ordering rule');

/** 创建一个按数值字段选极值行的 selector operation schema。 */
const createMinMaxSelectorOperationSchema = <TKind extends string>(kind: TKind) =>
  z
    .strictObject({
      kind: z.literal(kind).describe('Discriminator: min/max row selector'),
      by: z.string().min(1).describe('Numeric ranking field'),
      tie: z.enum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
    })
    .describe('Min/max row selector operation');

/** 创建一个按输入顺序或显式 orderBy 取首尾行的 selector operation schema。 */
const createFirstLastSelectorOperationSchema = <TKind extends string>(kind: TKind) =>
  z
    .strictObject({
      kind: z.literal(kind).describe('Discriminator: first/last row selector'),
      orderBy: z
        .array(OrderBySchema)
        .min(1)
        .optional()
        .describe('Ordering before selection; omitted keeps current order'),
    })
    .describe('First/last row selector operation');

/** 创建一个按数值字段排名并选择 N 行的 selector operation schema。 */
const createTopBottomSelectorOperationSchema = <TKind extends string>(kind: TKind) =>
  z
    .strictObject({
      kind: z.literal(kind).describe('Discriminator: top/bottom row selector'),
      by: z.string().min(1).describe('Numeric ranking field'),
      n: z.number().int().positive().describe('Selected row count'),
      tie: z.enum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
    })
    .describe('Top/bottom row selector operation');

/** nth selector operation schema；按显式 orderBy 选择零基下标行。 */
const NthSelectorOperationSchema = z
  .strictObject({
    kind: z.literal(SelectorOperationKind.Nth).describe('Discriminator: nth row selector'),
    orderBy: z.array(OrderBySchema).min(1).describe('Ordering before selection'),
    index: z.number().int().nonnegative().describe('Zero-based row index'),
  })
  .describe('Nth row selector operation');

/** outside-quantile-band selector 边界策略 schema。 */
export const OutsideQuantileBandBoundarySpecSchema = z
  .discriminatedUnion('kind', [
    z
      .strictObject({
        kind: z.literal('band').describe('Discriminator: quantile band boundaries'),
      })
      .describe('Quantile band boundary strategy'),
    z
      .strictObject({
        kind: z.literal('spread').describe('Discriminator: spread fences'),
        factor: z.number().nonnegative().optional().describe('Spread multiplier; default 1.5'),
      })
      .describe('Spread fence boundary strategy'),
  ])
  .describe('Outside quantile-band boundary strategy');

/** outside-quantile-band selector operation schema；选择分位区间或 spread fence 外的原始行。 */
export const OutsideQuantileBandSelectorOperationSchema = z
  .strictObject({
    kind: z.literal(SelectorOperationKind.OutsideQuantileBand).describe('Discriminator: outside-band selector'),
    field: z.string().min(1).describe('Numeric source field'),
    lowerP: z.number().min(0).max(1).describe('Lower quantile probability'),
    upperP: z.number().min(0).max(1).describe('Upper quantile probability'),
    boundary: OutsideQuantileBandBoundarySpecSchema.optional().describe('Boundary strategy; default band'),
  })
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Outside quantile-band row selector operation');

/** 内置 selector operation 的 schema 单一真源；aggregate schema 与 provider definition 共用这些实例。 */
export const BuiltinSelectorOperationSchemas = Object.freeze({
  Min: createMinMaxSelectorOperationSchema(SelectorOperationKind.Min),
  Max: createMinMaxSelectorOperationSchema(SelectorOperationKind.Max),
  First: createFirstLastSelectorOperationSchema(SelectorOperationKind.First),
  Last: createFirstLastSelectorOperationSchema(SelectorOperationKind.Last),
  Top: createTopBottomSelectorOperationSchema(SelectorOperationKind.Top),
  Bottom: createTopBottomSelectorOperationSchema(SelectorOperationKind.Bottom),
  Nth: NthSelectorOperationSchema,
  OutsideQuantileBand: OutsideQuantileBandSelectorOperationSchema,
});

/** 外部 row selector operation schema；只校验 JSON 形态和非内置 kind，具体契约由运行时 definition 提供。 */
const ExternalSelectorOperationSchema = z
  .looseObject({
    kind: z
      .string()
      .min(1)
      .refine(operationKind => !RESERVED_SELECTOR_OPERATION_KINDS.has(operationKind), {
        message: 'external selector kind must not collide with a built-in selector kind',
      })
      .describe('Discriminator: custom selector kind'),
  })
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message:
          'external selector operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Custom selector operation with JSON config');

/** 内置 row selector operation schema。 */
export const BuiltinSelectorOperationSchema = z
  .union([
    BuiltinSelectorOperationSchemas.Min,
    BuiltinSelectorOperationSchemas.Max,
    BuiltinSelectorOperationSchemas.First,
    BuiltinSelectorOperationSchemas.Last,
    BuiltinSelectorOperationSchemas.Top,
    BuiltinSelectorOperationSchemas.Bottom,
    BuiltinSelectorOperationSchemas.Nth,
    BuiltinSelectorOperationSchemas.OutsideQuantileBand,
  ])
  .describe('Built-in row selector operation');

/** row selector operation schema；包含内置 kind 与外部注册 kind 开放配置对象。 */
export const SelectorOperationSchema = z
  .union([BuiltinSelectorOperationSchema, ExternalSelectorOperationSchema])
  .describe('Built-in or custom row selector operation');
