import { isFiniteNumber } from '@retikz/math';

import type { DataSortOrderValue,ExternalRow, OrderBy } from '../../schemas';

import { DataSortOrder } from '../../schemas';
import { resolveFieldPath } from '../data';

/** quantile-band 的 spread whisker 默认倍率。 */
const DEFAULT_QUANTILE_BAND_SPREAD_FACTOR = 1.5;

/** 比较排序字段；空值稳定排到末尾。 */
const compareValues = (left: unknown, right: unknown): number => {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  return left < right ? -1 : 1;
};

/** 提取一组 rows 中某字段的有限数值，并保留原始行引用。 */
const finiteValueEntriesOf = (rows: Array<ExternalRow>, field: string): Array<{ row: ExternalRow; value: number }> => {
  const entries: Array<{ row: ExternalRow; value: number }> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) entries.push({ row, value });
  }
  return entries;
};

/** 计算中位数；空集合按统计变换的零值约定返回 0。 */
export const medianOf = (values: Array<number>): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** 在已排序数值数组上按线性插值计算分位点。 */
export const quantileOfSorted = (sorted: Array<number>, p: number): number => {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  const weight = index - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
};

/** 对未排序数组计算分位点。 */
export const quantileOf = (values: Array<number>, p: number): number =>
  quantileOfSorted(
    [...values].sort((a, b) => a - b),
    p,
  );

/** 计算有限数值范围；空集合按统计变换的零值约定返回 `[0, 0]`。 */
export const finiteExtentOf = (values: Array<number>): { min: number; max: number; count: number } => ({
  min: values.length === 0 ? 0 : Math.min(...values),
  max: values.length === 0 ? 0 : Math.max(...values),
  count: values.length,
});

/** 解析 spread whisker 倍率，未传时使用默认值。 */
export const spreadFactorOf = (factor: number | undefined): number => factor ?? DEFAULT_QUANTILE_BAND_SPREAD_FACTOR;

/** 计算参数化分位区间及其复用统计量。 */
export const quantileBandStatsOf = (
  rows: Array<ExternalRow>,
  field: string,
  lowerP: number,
  upperP: number,
): {
  entries: Array<{ row: ExternalRow; value: number }>;
  sortedValues: Array<number>;
  lower: number;
  upper: number;
  spread: number;
  min: number;
  max: number;
  count: number;
} => {
  const entries = finiteValueEntriesOf(rows, field);
  const sortedValues = entries.map(entry => entry.value).sort((a, b) => a - b);
  const lower = quantileOfSorted(sortedValues, lowerP);
  const upper = quantileOfSorted(sortedValues, upperP);
  const extent = finiteExtentOf(sortedValues);
  return {
    entries,
    sortedValues,
    lower,
    upper,
    spread: upper - lower,
    ...extent,
  };
};

/** 过滤闭区间 `[lower, upper]` 内的数值。 */
export const valuesWithin = (values: Array<number>, lower: number, upper: number): Array<number> =>
  values.filter(value => value >= lower && value <= upper);

/** 按 orderBy 稳定排序 rows；未传排序时返回浅拷贝。 */
export const orderRows = (rows: Array<ExternalRow>, orderBy?: Array<OrderBy>): Array<ExternalRow> => {
  if (orderBy === undefined || orderBy.length === 0) return [...rows];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const order of orderBy) {
        const direction = order.order === DataSortOrder.Descending ? -1 : 1;
        const compared = compareValues(
          resolveFieldPath(left.row, order.field),
          resolveFieldPath(right.row, order.field),
        );
        if (compared !== 0) return compared * direction;
      }
      return left.index - right.index;
    })
    .map(entry => entry.row);
};

/** 按数值字段稳定排名，并自动剔除非有限数值行。 */
export const rankedByNumericField = (
  rows: Array<ExternalRow>,
  field: string,
  direction: DataSortOrderValue,
): Array<ExternalRow> =>
  rows
    .map((row, index) => ({ row, index, value: resolveFieldPath(row, field) }))
    .filter((entry): entry is { row: ExternalRow; index: number; value: number } => isFiniteNumber(entry.value))
    .sort((left, right) => {
      const compared = left.value === right.value ? 0 : left.value < right.value ? -1 : 1;
      const directed = direction === DataSortOrder.Ascending ? compared : -compared;
      return directed === 0 ? left.index - right.index : directed;
    })
    .map(entry => entry.row);
