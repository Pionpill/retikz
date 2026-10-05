import { createDataCell, DataExpandSchema } from '../../_cell/data';
import { resolveCell } from '../../_cell/resolve';
import { ArrayCellIdMode } from '../constants';
import type { IRArray, IRArrayCell } from '../schema';
import { ArrayIndexOptionsSchema, ArrayLayoutSchema } from '../schema';
import type { CanonicalArray } from './types';

/** 解析 Array 的结构默认与每格样式，不改写稀疏 Source */
export const resolveArray = (source: IRArray): CanonicalArray => {
  const { data, items, skeleton, cellIdMode, dataExpand, ...input } = source;
  const expansion = dataExpand ?? DataExpandSchema.parse(undefined);
  const cells: Array<string | IRArrayCell> =
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
    index:
      index === undefined || index === false
        ? false
        : {
            position: index.position ?? ArrayIndexOptionsSchema.options[0].shape.position.parse(undefined),
            ...(index.labels === undefined
              ? { start: index.start ?? ArrayIndexOptionsSchema.options[0].shape.start.parse(undefined) }
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
