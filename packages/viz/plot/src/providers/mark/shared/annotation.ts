import type { ExternalRow } from '@retikz/data';

import { RetikzPlotError } from '../../../error';
import type { IRPlotAnnotationPositionValue } from '../../../schemas';
import { channelValue } from '../../channel/shared';

/** 读取标注的数据位置，edge 不产生数据值，不允许行数据模拟位置引用 */
export const annotationValue = (
  source: IRPlotAnnotationPositionValue,
  row?: ExternalRow,
): string | number | undefined => {
  if (typeof source !== 'object') return source;
  if ('edge' in source) return undefined;
  if ('field' in source && row === undefined)
    throw new RetikzPlotError(`Annotation field "${source.field}" requires a data row`);
  const value = channelValue(source, row ?? {});
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string')
    throw new RetikzPlotError(
      `Annotation position cannot map ${'field' in source ? `field "${source.field}"` : 'value'}`,
    );
  return value;
};
