import type { ExternalRow } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';

import { RetikzPlotError } from '../../../error';
import type { IRPlotAnnotationPositionValue } from '../../../schemas';

/** 读取标注的数据位置，edge 不产生数据值，不允许行数据模拟位置引用 */
export const annotationValue = (
  property: IRPlotAnnotationPositionValue | undefined,
  field?: string,
  row?: ExternalRow,
): string | number | undefined => {
  if (field === undefined) return typeof property === 'object' ? undefined : property;
  if (row === undefined) throw new RetikzPlotError(`Annotation field "${field}" requires a data row`);
  const value = resolveFieldPath(row, field);
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string')
    throw new RetikzPlotError(`Annotation position cannot map field "${field}"`);
  return value;
};
