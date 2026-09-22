import { createDataCell } from '../../shared/cell/data';
import { resolveCell } from '../../shared/cell/resolve';
import type { IRList } from '../schema';
import { ListLayoutSchema, ListSchema } from '../schema';
import type { CanonicalList } from './types';
/** 解析 List 的结构默认与每格样式，不改写稀疏 Source */
export const resolveList = (source: IRList): CanonicalList => {
  const { data, items, ...input } = source;
  const cells = data === undefined ? items : data.map(createDataCell);
  return {
    ...input,
    items: cells.map(cell =>
      resolveCell(
        typeof cell === 'string' ? { content: cell, id: cell } : cell,
        source.style,
        undefined,
        source.layout,
      ),
    ),
    layout: {
      ...source.layout,
      direction: source.layout?.direction ?? ListLayoutSchema.shape.direction.parse(undefined),
      gap: source.layout?.gap ?? ListLayoutSchema.shape.gap.parse(undefined),
    },
    showIndex: source.showIndex ?? ListSchema.options[0].shape.showIndex.parse(undefined),
    indexStart: source.indexStart ?? ListSchema.options[0].shape.indexStart.parse(undefined),
  };
};
