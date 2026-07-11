import type { ExternalRow, IRDataSortTransform } from '../../schemas';

import { DataSortOrder } from '../../schemas';
import { compareRowsByFieldPath } from '../data';

/** sort transform 实现：按字段升 / 降序稳定排序，等键保持原序。 */
export const applySort = (rows: Array<ExternalRow>, operation: IRDataSortTransform): Array<ExternalRow> => {
  const direction = operation.order === DataSortOrder.Descending ? -1 : 1;
  return [...rows].sort((a, b) => direction * compareRowsByFieldPath(a, b, operation.field));
};
