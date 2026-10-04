import { createDataCell, DataExpandSchema } from '../../_cell/data';
import { resolveCell } from '../../_cell/resolve';
import { ListCellIdMode } from '../constants';
import type { IRList, IRListCell } from '../schema';
import { ListIndexOptionsSchema, ListLayoutSchema } from '../schema';
import type { CanonicalList } from './types';

/** 解析 List 的结构默认与每格样式，不改写稀疏 Source */
export const resolveList = (source: IRList): CanonicalList => {
  const { data, items, skeleton, cellIdMode, dataExpand, ...input } = source;
  const expansion = dataExpand ?? DataExpandSchema.parse(undefined);
  const cells: Array<string | IRListCell> =
    skeleton !== undefined
      ? skeleton.labels !== undefined
        ? skeleton.labels.map(content => (content === '' ? {} : { content }))
        : Array.from({ length: skeleton.count }, () => ({}))
      : data !== undefined
        ? data.map(value => createDataCell(value, expansion, source.layout?.width === 'content'))
        : items;
  const index = source.index === true ? {} : source.index;
  const indexStyle = index ? index.style : undefined;
  return {
    ...input,
    items: cells.map((cell, cellIndex) => {
      const resolved = resolveCell(
        typeof cell === 'string'
          ? { content: cell, ...(cellIdMode === ListCellIdMode.String ? { id: cell } : {}) }
          : cell,
        { overallStyle: source.style, overallLayout: source.layout },
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
    index:
      index === undefined || index === false
        ? false
        : {
            position: index.position ?? ListIndexOptionsSchema.options[0].shape.position.parse(undefined),
            ...(index.labels === undefined
              ? { start: index.start ?? ListIndexOptionsSchema.options[0].shape.start.parse(undefined) }
              : { labels: index.labels }),
            style: {
              ...(source.style?.textColor === undefined ? {} : { textColor: source.style.textColor }),
              ...indexStyle,
              ...(source.style?.font === undefined && indexStyle?.font === undefined
                ? {}
                : { font: { ...source.style?.font, ...indexStyle?.font } }),
            },
          },
  };
};
