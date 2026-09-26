import { createDataCell, DataObjectDisplaySchema } from '../../shared/cell/data';
import { resolveCell } from '../../shared/cell/resolve';
import { ListCellIdMode } from '../constants';
import type { IRList } from '../schema';
import { ListIndexOptionsSchema, ListLayoutSchema } from '../schema';
import type { CanonicalList } from './types';
/** 解析 List 的结构默认与每格样式，不改写稀疏 Source */
export const resolveList = (source: IRList): CanonicalList => {
  const { data, items, cellIdMode, dataObjectDisplay, ...input } = source;
  const objectDisplay = dataObjectDisplay ?? DataObjectDisplaySchema.parse(undefined);
  const cells =
    data === undefined
      ? items
      : data.map(value => createDataCell(value, objectDisplay, source.layout?.width === 'content'));
  const index = source.index === true ? {} : source.index;
  const indexStyle = index ? index.style : undefined;
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
    index:
      index === undefined || index === false
        ? false
        : {
            position: index.position ?? ListIndexOptionsSchema.shape.position.parse(undefined),
            start: index.start ?? ListIndexOptionsSchema.shape.start.parse(undefined),
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
