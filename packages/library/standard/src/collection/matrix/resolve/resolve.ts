import { createDataCell, DataExpandSchema } from '../../_cell/data';
import { resolveCell } from '../../_cell/resolve';
import type { IRCell } from '../../_cell/schema';
import { resolveCollectionIndex } from '../../_index/resolve';
import { MatrixLayoutSchema } from '../schema';
import type { IRMatrix } from '../schema';
import type { CanonicalMatrix } from './types';

/** 将三种矩形输入解析为共享单格，不改变 Source */
export const resolveMatrix = (source: IRMatrix): CanonicalMatrix => {
  const { items, data, skeleton, dataExpand, cellIdMode, index, layout, ...input } = source;
  const expansion = dataExpand ?? DataExpandSchema.parse(undefined);
  const rows: Array<Array<string | IRCell>> =
    skeleton !== undefined
      ? skeleton.labels !== undefined
        ? skeleton.labels.map(row => row.map(content => (content === '' ? {} : { content })))
        : skeleton.rows === 0 || skeleton.columns === 0
          ? []
          : Array.from({ length: skeleton.rows }, () => Array.from({ length: skeleton.columns }, () => ({})))
      : data !== undefined
        ? data.map(row => row.map(value => createDataCell(value, expansion)))
        : items;

  const gap = layout?.gap ?? MatrixLayoutSchema.shape.gap.parse(undefined);
  const axes = index === true ? { row: true, column: true } : index || {};

  return {
    ...input,
    items: rows.map((row, r) =>
      row.map((cell, c) => {
        const resolved = resolveCell(cell, { overallStyle: source.style, overallLayout: layout });
        if (cellIdMode !== 'index') return resolved;

        const id = `${source.id}-${r}-${c}`;

        return {
          ...resolved,
          id,
          ...(resolved.id === undefined || resolved.id === id ? {} : { aliasIds: [resolved.id] }),
        };
      }),
    ),
    layout: { ...layout, gap: typeof gap === 'number' ? { row: gap, column: gap } : gap },
    index: {
      row: resolveCollectionIndex(axes.row, source.style),
      column: resolveCollectionIndex(axes.column, source.style),
    },
  };
};
