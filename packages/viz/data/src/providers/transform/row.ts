import type { ExternalRow, SortTransform } from '../../schemas';

import { PlotSortOrder } from '../../schemas';
import { compareRowsByFieldPath } from '../data';

/** 稳定排序：按字段升 / 降序；等键保持原序。 */
export const applySort = (rows: Array<ExternalRow>, operation: SortTransform): Array<ExternalRow> => {
  const direction = operation.order === PlotSortOrder.Descending ? -1 : 1;
  return [...rows].sort((a, b) => direction * compareRowsByFieldPath(a, b, operation.field));
};
