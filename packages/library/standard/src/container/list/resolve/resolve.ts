import { createDataCell } from '../../shared/cell/data';
import { resolveCell } from '../../shared/cell/resolve';
import { ListCellIdMode } from '../constants';
import type { IRList } from '../schema';
import { ListLayoutSchema, ListSchema } from '../schema';
import type { CanonicalList } from './types';
/** 解析 List 的结构默认与每格样式，不改写稀疏 Source */
export const resolveList = (source: IRList): CanonicalList => {
  const { data, items, cellIdMode, ...input } = source;
  const cells = data === undefined ? items : data.map(createDataCell);
  return {
    ...input,
    items: cells.map((cell, cellIndex) => {
      const resolved = resolveCell(
        typeof cell === 'string'
          ? { content: cell, ...(cellIdMode === ListCellIdMode.String ? { id: cell } : {}) }
          : cell,
        source.style,
        undefined,
        source.layout,
      );
      if (cellIdMode !== ListCellIdMode.Index) return resolved;
      const id = `${source.id}-${cellIndex}`;
      return {
        ...resolved,
        id,
        ...(resolved.id === undefined || resolved.id === id ? {} : { aliasIds: [resolved.id] }),
      };
    }),
    layout: {
      ...source.layout,
      direction: source.layout?.direction ?? ListLayoutSchema.shape.direction.parse(undefined),
      gap: source.layout?.gap ?? ListLayoutSchema.shape.gap.parse(undefined),
    },
    showIndex: source.showIndex ?? ListSchema.options[0].shape.showIndex.parse(undefined),
    indexStart: source.indexStart ?? ListSchema.options[0].shape.indexStart.parse(undefined),
  };
};
