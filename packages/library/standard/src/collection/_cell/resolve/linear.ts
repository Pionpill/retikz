import type { JsonValue } from '@retikz/foundation';
import type { input } from 'zod';

import { createDataCell, DataExpandSchema } from '../data';
import type { IRCell, LinearCellSkeletonSchema } from '../schema';

/** 展开一维数据或骨架；显式单格由调用方保留其身份及专属布局字段 */
export const expandLinearCells = (
  source:
    | { data: ReadonlyArray<JsonValue>; dataExpand?: input<typeof DataExpandSchema>; skeleton?: never }
    | { data?: never; dataExpand?: never; skeleton: input<typeof LinearCellSkeletonSchema> },
  inheritContentWidth = false,
): Array<IRCell> => {
  if (source.data !== undefined) {
    const expansion = source.dataExpand ?? DataExpandSchema.parse(undefined);
    return source.data.map(value => createDataCell(value, expansion, inheritContentWidth));
  }

  const { skeleton } = source;
  return skeleton.labels !== undefined
    ? skeleton.labels.map(content => (content === '' ? {} : { content }))
    : Array.from({ length: skeleton.count }, () => ({}));
};
