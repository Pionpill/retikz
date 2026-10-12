import { isFiniteNumber } from '@retikz/math';

import { resolveFieldPath } from '../model';
import type { ExternalRow } from '../shared';
import type { IRDataOrderBy } from './schema';
import { DataSortOrder } from './schema';

/** 判断排序值是否缺失或为非有限数值 */
const isMissingSortValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'number' && !isFiniteNumber(value));

/**
 * 按字段路径和方向比较两行
 * @description missing / 非有限数值始终排在有效值之后；有限数值按数值比较，其余按稳定字符串序比较
 */
export const compareRowsByFieldPath = (
  a: ExternalRow,
  b: ExternalRow,
  path: string,
  order: DataSortOrder = DataSortOrder.Ascending,
): number => {
  const va = resolveFieldPath(a, path);
  const vb = resolveFieldPath(b, path);
  const aMissing = isMissingSortValue(va);
  const bMissing = isMissingSortValue(vb);
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }

  const compared =
    isFiniteNumber(va) && isFiniteNumber(vb)
      ? va - vb
      : String(va) === String(vb)
        ? 0
        : String(va) < String(vb)
          ? -1
          : 1;

  return order === DataSortOrder.Descending ? -compared : compared;
};

/** 按 orderBy 稳定排序 rows；未传排序规则时返回浅拷贝 */
export const orderRows = (rows: Array<ExternalRow>, orderBy?: Array<IRDataOrderBy>): Array<ExternalRow> => {
  if (orderBy === undefined || orderBy.length === 0) return [...rows];

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const order of orderBy) {
        const compared = compareRowsByFieldPath(left.row, right.row, order.field, order.order);
        if (compared !== 0) return compared;
      }

      return left.index - right.index;
    })
    .map(entry => entry.row);
};
