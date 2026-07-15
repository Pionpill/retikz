import type { AnyRowSelectorDefinition } from '../../contract';
import type { RowSelectorTieValue } from '../../schemas';
import type { ExternalRow } from '../../shared';

import { defineRowSelector } from '../../contract';
import { BuiltinSelectorOperationSchemas, DataSortOrder, RowSelectorTie } from '../../schemas';
import { resolveFieldPath } from '../data';
import { freezeDefinitions } from '../shared';
import { orderRows, quantileBandStatsOf, rankedByNumericField, spreadFactorOf } from './helpers';

/** 按 top/bottom 的第 N 名阈值处理边界并列行，支持 first / last / all tie 策略 */
const selectTopBottomRows = (
  ranked: Array<ExternalRow>,
  operation: { by: string; n: number; tie?: RowSelectorTieValue },
): Array<ExternalRow> => {
  const selected = ranked.slice(0, operation.n);
  if (selected.length === 0 || ranked.length <= selected.length) return selected;

  const threshold = resolveFieldPath(selected[selected.length - 1], operation.by);
  if (operation.tie === RowSelectorTie.All) {
    for (const row of ranked.slice(operation.n)) {
      if (resolveFieldPath(row, operation.by) !== threshold) break;
      selected.push(row);
    }
  }
  if (operation.tie === RowSelectorTie.Last) {
    for (const row of ranked.slice(operation.n)) {
      if (resolveFieldPath(row, operation.by) !== threshold) break;
      selected[selected.length - 1] = row;
    }
  }
  return selected;
};

/** min selector definition：选择数值最小的原始行 */
const minSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.Min,
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

/** max selector definition：选择数值最大的原始行 */
const maxSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.Max,
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

/** first selector definition：选择输入顺序或稳定排序后的首行 */
const firstSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.First,
  inputFields: operation => operation.orderBy?.map(order => order.field) ?? [],
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return ordered.length === 0 ? [] : [{ row: ordered[0], rank: 1 }];
  },
});

/** last selector definition：选择输入顺序或稳定排序后的末行 */
const lastSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.Last,
  inputFields: operation => operation.orderBy?.map(order => order.field) ?? [],
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return ordered.length === 0 ? [] : [{ row: ordered[ordered.length - 1], rank: 1 }];
  },
});

/** top selector definition：按数值字段选择前 N 行 */
const topSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.Top,
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, DataSortOrder.Descending);
    const selected = selectTopBottomRows(ranked, operation);
    return selected.map((row, index) => ({ row, rank: index + 1 }));
  },
});

/** bottom selector definition：按数值字段选择后 N 行 */
const bottomSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.Bottom,
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, DataSortOrder.Ascending);
    const selected = selectTopBottomRows(ranked, operation);
    return selected.map((row, index) => ({ row, rank: index + 1 }));
  },
});

/** nth selector definition：按稳定排序选择指定零基下标行 */
const nthSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.Nth,
  inputFields: operation => operation.orderBy.map(order => order.field),
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return operation.index >= ordered.length ? [] : [{ row: ordered[operation.index], rank: operation.index + 1 }];
  },
});

/** outside-quantile-band selector definition：选择参数化分位区间或 spread fence 外的原始行 */
const outsideQuantileBandSelectorDefinition = defineRowSelector({
  schema: BuiltinSelectorOperationSchemas.OutsideQuantileBand,
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

/** 内置 row selector 定义集合；内置与自定义 selector 共享同一 registry 分派流程 */
export const BUILTIN_ROW_SELECTORS: ReadonlyArray<AnyRowSelectorDefinition> = freezeDefinitions([
  minSelectorDefinition,
  maxSelectorDefinition,
  firstSelectorDefinition,
  lastSelectorDefinition,
  topSelectorDefinition,
  bottomSelectorDefinition,
  nthSelectorDefinition,
  outsideQuantileBandSelectorDefinition,
]);
