import { expandLinearCells, resolveCell } from '../../_cell/resolve';
import { resolveCollectionIndex } from '../../_index/resolve';
import { ArrayCellIdMode } from '../constants';
import type { IRArray } from '../schema';
import { ArrayLayoutSchema } from '../schema';
import type { CanonicalArray } from './types';

/** 解析 Array 的结构默认与每格样式，不改写稀疏 Source */
export const resolveArray = (source: IRArray): CanonicalArray => {
  const { data, items, skeleton, cellIdMode, dataExpand, ...input } = source;
  const cells =
    items ??
    expandLinearCells(data !== undefined ? { data, dataExpand } : { skeleton }, source.layout?.width === 'content');

  return {
    ...input,
    items: cells.map((cell, cellIndex) => {
      const resolved = resolveCell(
        typeof cell === 'string'
          ? { content: cell, ...(cellIdMode === ArrayCellIdMode.String ? { id: cell } : {}) }
          : cell,
        { overallStyle: source.style, overallLayout: source.layout },
      );
      if (cellIdMode !== ArrayCellIdMode.Index) return resolved;

      const id = `${source.id}-${cellIndex}`;

      return {
        ...resolved,
        id,
        ...(resolved.id === undefined || resolved.id === id ? {} : { aliasIds: [resolved.id] }),
      };
    }),
    layout: {
      ...source.layout,
      direction: source.layout?.direction ?? ArrayLayoutSchema.shape.direction.parse(undefined),
      gap: source.layout?.gap ?? ArrayLayoutSchema.shape.gap.parse(undefined),
    },
    index: resolveCollectionIndex(source.index, source.style),
  };
};
