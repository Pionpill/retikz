import type { IRDataSortTransform } from '../../schemas';
import type { ExternalRow } from '../../shared';

import { compareRowsByFieldPath } from '../data';

/** sort transform 实现：按字段升 / 降序稳定排序，等键保持原序。 */
export const applySort = (rows: Array<ExternalRow>, operation: IRDataSortTransform): Array<ExternalRow> => {
  return [...rows].sort((a, b) => compareRowsByFieldPath(a, b, operation.field, operation.order));
};
