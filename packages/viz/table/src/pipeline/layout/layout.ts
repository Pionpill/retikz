import type { BoundsRect, Position } from '@retikz/math';

import type { SemanticTableModel } from '../../contract';
import type { IRTableLayout } from '../../schemas';
import type { TableLayout, TableTrackLayout } from './types';

import { TableRowKind } from '../../schemas';
import { deepFreeze } from '../../shared';
import { resolveTableLayoutSpec } from './resolve';

/** 从 canonical model 计算 renderer-agnostic 固定轨道几何 */
export const layoutTable = (model: SemanticTableModel, spec?: IRTableLayout): TableLayout => {
  const resolved = resolveTableLayoutSpec(spec);
  const columns: Array<TableTrackLayout> = model.columns.map((column, index) => ({
    id: column.id,
    index,
    offset: index * (resolved.columnWidth + resolved.columnGap),
    size: resolved.columnWidth,
  }));

  let rowOffset = 0;
  const rows: Array<TableTrackLayout> = model.rows.map((row, index) => {
    const size = row.kind === TableRowKind.ColumnHeader ? resolved.headerHeight : resolved.rowHeight;
    const track = { id: row.id, index, offset: rowOffset, size };
    rowOffset += size + (index < model.rows.length - 1 ? resolved.rowGap : 0);
    return track;
  });

  const bounds: BoundsRect = {
    x: 0,
    y: 0,
    width: model.columns.length * resolved.columnWidth + Math.max(0, model.columns.length - 1) * resolved.columnGap,
    height: rowOffset,
  };
  const cells = model.cells.map(cell => {
    const row = rows.at(cell.rowIndex);
    const column = columns.at(cell.columnIndex);
    if (row === undefined || model.rows[cell.rowIndex]?.id !== cell.rowId) {
      throw new Error(`table: layout Cell "${cell.id}" references an unknown canonical row`);
    }
    if (column === undefined || model.columns[cell.columnIndex]?.id !== cell.columnId) {
      throw new Error(`table: layout Cell "${cell.id}" references an unknown canonical column`);
    }
    const box: BoundsRect = {
      x: column.offset,
      y: row.offset,
      width: column.size,
      height: row.size,
    };
    const contentCenter: Position = [box.x + box.width / 2, box.y + box.height / 2];
    return { cellId: cell.id, box, contentCenter };
  });

  return deepFreeze({ bounds, rows, columns, cells });
};
