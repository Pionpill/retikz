import { z } from 'zod';

import type { AnyRowSelectorDefinition } from '../../contract';

import { defineRowSelector } from '../../contract';
import { DataSortOrder, OutsideQuantileBandSelectorOperationSchema, RowSelectorTie, SelectorOp } from '../../schemas';
import { resolveFieldPath } from '../data';
import { orderRows, quantileBandStatsOf, rankedByNumericField, spreadFactorOf } from './helpers';

/** `min` selector：选择数值最小的原始行。 */
const minSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.Min),
    by: z.string().min(1),
    tie: z.enum(RowSelectorTie).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, DataSortOrder.Ascending);
    if (ranked.length === 0) return [];
    if (operation.tie === RowSelectorTie.All) {
      const value = resolveFieldPath(ranked[0], operation.by);
      return ranked
        .filter(row => resolveFieldPath(row, operation.by) === value)
        .map((row, index) => ({ row, rank: index + 1 }));
    }
    const row =
      operation.tie === RowSelectorTie.Last
        ? ([...ranked]
            .reverse()
            .find(
              candidate => resolveFieldPath(candidate, operation.by) === resolveFieldPath(ranked[0], operation.by),
            ) ?? ranked[0])
        : ranked[0];
    return [{ row, rank: 1 }];
  },
});

/** `max` selector：选择数值最大的原始行。 */
const maxSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.Max),
    by: z.string().min(1),
    tie: z.enum(RowSelectorTie).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, DataSortOrder.Descending);
    if (ranked.length === 0) return [];
    if (operation.tie === RowSelectorTie.All) {
      const value = resolveFieldPath(ranked[0], operation.by);
      return ranked
        .filter(row => resolveFieldPath(row, operation.by) === value)
        .map((row, index) => ({ row, rank: index + 1 }));
    }
    const row =
      operation.tie === RowSelectorTie.Last
        ? ([...ranked]
            .reverse()
            .find(
              candidate => resolveFieldPath(candidate, operation.by) === resolveFieldPath(ranked[0], operation.by),
            ) ?? ranked[0])
        : ranked[0];
    return [{ row, rank: 1 }];
  },
});

/** `first` selector：选择当前顺序或稳定排序后的首行。 */
const firstSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.First),
    orderBy: z
      .array(z.object({ field: z.string().min(1), order: z.enum(DataSortOrder).optional() }))
      .min(1)
      .optional(),
  }),
  inputFields: operation => operation.orderBy?.map(order => order.field) ?? [],
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return ordered.length === 0 ? [] : [{ row: ordered[0], rank: 1 }];
  },
});

/** `last` selector：选择当前顺序或稳定排序后的末行。 */
const lastSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.Last),
    orderBy: z
      .array(z.object({ field: z.string().min(1), order: z.enum(DataSortOrder).optional() }))
      .min(1)
      .optional(),
  }),
  inputFields: operation => operation.orderBy?.map(order => order.field) ?? [],
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return ordered.length === 0 ? [] : [{ row: ordered[ordered.length - 1], rank: 1 }];
  },
});

/** `top` selector：按数值字段选择前 N 行。 */
const topSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.Top),
    by: z.string().min(1),
    n: z.number().int().positive(),
    tie: z.enum(RowSelectorTie).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, DataSortOrder.Descending);
    const selected = ranked.slice(0, operation.n);
    if (operation.tie === RowSelectorTie.All && selected.length > 0 && ranked.length > selected.length) {
      const threshold = resolveFieldPath(selected[selected.length - 1], operation.by);
      for (const row of ranked.slice(operation.n)) {
        if (resolveFieldPath(row, operation.by) !== threshold) break;
        selected.push(row);
      }
    }
    return selected.map((row, index) => ({ row, rank: index + 1 }));
  },
});

/** `bottom` selector：按数值字段选择后 N 行。 */
const bottomSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.Bottom),
    by: z.string().min(1),
    n: z.number().int().positive(),
    tie: z.enum(RowSelectorTie).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, DataSortOrder.Ascending);
    const selected = ranked.slice(0, operation.n);
    if (operation.tie === RowSelectorTie.All && selected.length > 0 && ranked.length > selected.length) {
      const threshold = resolveFieldPath(selected[selected.length - 1], operation.by);
      for (const row of ranked.slice(operation.n)) {
        if (resolveFieldPath(row, operation.by) !== threshold) break;
        selected.push(row);
      }
    }
    return selected.map((row, index) => ({ row, rank: index + 1 }));
  },
});

/** `nth` selector：按稳定排序选择指定零基下标行。 */
const nthSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal(SelectorOp.Nth),
    orderBy: z
      .array(z.object({ field: z.string().min(1), order: z.enum(DataSortOrder).optional() }))
      .min(1),
    index: z.number().int().nonnegative(),
  }),
  inputFields: operation => operation.orderBy.map(order => order.field),
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return operation.index >= ordered.length ? [] : [{ row: ordered[operation.index], rank: operation.index + 1 }];
  },
});

/** `outside-quantile-band` selector：选择参数化分位区间或 spread fence 外的原始行。 */
const outsideQuantileBandSelectorDefinition = defineRowSelector({
  schema: OutsideQuantileBandSelectorOperationSchema,
  inputFields: operation => [operation.field],
  select: (rows, operation) => {
    const stats = quantileBandStatsOf(rows, operation.field, operation.lowerP, operation.upperP);
    const boundary = operation.boundary ?? { kind: 'band' };
    const factor = boundary.kind === 'spread' ? spreadFactorOf(boundary.factor) : 0;
    const lower = boundary.kind === 'spread' ? stats.lower - factor * stats.spread : stats.lower;
    const upper = boundary.kind === 'spread' ? stats.upper + factor * stats.spread : stats.upper;
    return stats.entries
      .filter(entry => entry.value < lower || entry.value > upper)
      .map((entry, index) => ({ row: entry.row, rank: index + 1 }));
  },
});

/** 内置 row selector 定义集合。 */
export const BUILTIN_ROW_SELECTORS: ReadonlyArray<AnyRowSelectorDefinition> = [
  minSelectorDefinition,
  maxSelectorDefinition,
  firstSelectorDefinition,
  lastSelectorDefinition,
  topSelectorDefinition,
  bottomSelectorDefinition,
  nthSelectorDefinition,
  outsideQuantileBandSelectorDefinition,
] as ReadonlyArray<AnyRowSelectorDefinition>;
