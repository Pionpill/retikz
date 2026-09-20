import type { IRList } from '../../composites/presentation/list/schemas';
import { ListLayoutSchema, ListSchema } from '../../composites/presentation/list/schemas';
import { resolveCell } from '../cell';
import type { CanonicalList } from './types';
/** 解析 List 的结构默认与每格样式，不改写稀疏 Source */
export const resolveList = (source: IRList): CanonicalList => ({
  ...source,
  items: source.items.map(cell =>
    resolveCell(typeof cell === 'string' ? { content: cell, id: cell } : cell, source.style, undefined, source.layout),
  ),
  layout: {
    ...source.layout,
    direction: source.layout?.direction ?? ListLayoutSchema.shape.direction.parse(undefined),
    gap: source.layout?.gap ?? ListLayoutSchema.shape.gap.parse(undefined),
  },
  showIndex: source.showIndex ?? ListSchema.shape.showIndex.parse(undefined),
  indexStart: source.indexStart ?? ListSchema.shape.indexStart.parse(undefined),
});
