import type {
  CompositeCompileChild,
  IRNode,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, measureCell, measureCellChild } from '../_cell';
import type { CellPlacement, MeasuredCell } from '../_cell';
import { resolveMatrix } from './resolve';
import type { IRMatrix } from './schema';

/** 共享行列轨道的矩形布局；测量一次后复用单格与索引 */
export const compileMatrix = (node: IRMatrix, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { namespace: _namespace, type: _type, items, layout, index, style, label, ...scope } = resolveMatrix(node);
  void _namespace;
  void _type;
  const rows = items.length,
    columns = items[0]?.length ?? 0;
  if (rows === 0 || columns === 0)
    return compileCells([], { width: 0, height: 0, scope, decoration: { label, style } }, context);
  const widths = Array<number>(columns).fill(0),
    heights = Array<number>(rows).fill(0);
  const measured: Array<Array<MeasuredCell>> = [];
  for (let r = 0; r < rows; r++) {
    const row: Array<MeasuredCell> = [];
    for (let c = 0; c < columns; c++) {
      const cell = measureCell(items[r][c], context, r * columns + c, scope);
      row.push(cell);
      widths[c] = Math.max(widths[c], cell.width);
      heights[r] = Math.max(heights[r], cell.height);
    }
    measured.push(row);
  }
  const axisResults: { row: Array<LayoutChildResult | undefined>; column: Array<LayoutChildResult | undefined> } = {
    row: [],
    column: [],
  };
  const strips = { row: 0, column: 0 };
  let occurrence = rows * columns;
  for (const axis of ['row', 'column'] as const) {
    const options = index[axis];
    if (!options) continue;
    let visible = false;
    for (let i = 0; i < (axis === 'row' ? rows : columns); i++) {
      const text = options.labels === undefined ? String(options.start + i) : options.labels[i];
      if (text === '') {
        axisResults[axis].push(undefined);
        continue;
      }
      const child: IRNode = {
        type: 'node',
        position: [0, 0],
        text,
        style: { fill: 'none', stroke: 'none', ...options.style },
        layout: { padding: 0, margin: 0 },
      };
      const result = measureCellChild(context, child, occurrence++, scope);
      axisResults[axis].push(result);
      visible = true;
      strips[axis] = Math.max(strips[axis], axis === 'row' ? result.slotSize.width : result.slotSize.height);
    }
    if (visible) strips[axis] += axis === 'row' ? layout.gap.column : layout.gap.row;
  }
  const gridWidth = widths.reduce((sum, value) => sum + value, 0) + (columns - 1) * layout.gap.column;
  const gridHeight = heights.reduce((sum, value) => sum + value, 0) + (rows - 1) * layout.gap.row;
  const xOffset = index.row && index.row.position === 'before' ? strips.row : 0;
  const yOffset = index.column && index.column.position === 'before' ? strips.column : 0;
  const cells: Array<CellPlacement> = [],
    extra: Array<CompositeCompileChild> = [];
  let y = yOffset;
  for (let r = 0; r < rows; r++) {
    let x = xOffset;
    for (let c = 0; c < columns; c++) {
      const cell = measured[r][c];
      cells.push({
        measured: cell,
        x,
        y,
        width: typeof cell.cell.layout.width === 'number' ? cell.width : widths[c],
        height: typeof cell.cell.layout.height === 'number' ? cell.height : heights[r],
        role: 'matrix-cell',
      });
      x += widths[c] + layout.gap.column;
    }
    y += heights[r] + layout.gap.row;
  }
  for (const axis of ['row', 'column'] as const) {
    const options = index[axis];
    if (!options) continue;
    const rowAxis = axis === 'row';
    const tracks = rowAxis ? heights : widths;
    const stripSize = strips[axis] - (rowAxis ? layout.gap.column : layout.gap.row);
    const stripPosition =
      options.position === 'before' ? 0 : rowAxis ? gridWidth + layout.gap.column : gridHeight + layout.gap.row;
    let cursor = rowAxis ? yOffset : xOffset;
    for (let i = 0; i < tracks.length; i++) {
      const result = axisResults[axis][i];
      if (result)
        extra.push(
          context.replay(result, {
            transforms: [
              {
                kind: 'translate',
                x:
                  (rowAxis ? stripPosition + stripSize / 2 : cursor + tracks[i] / 2) -
                  result.slotSize.width / 2 -
                  result.allocationBounds.x,
                y:
                  (rowAxis ? cursor + tracks[i] / 2 : stripPosition + stripSize / 2) -
                  result.slotSize.height / 2 -
                  result.allocationBounds.y,
              },
            ],
          }),
        );
      cursor += tracks[i] + (rowAxis ? layout.gap.row : layout.gap.column);
    }
  }
  return compileCells(
    cells,
    { width: gridWidth + strips.row, height: gridHeight + strips.column, scope, extra, decoration: { label, style } },
    context,
  );
};
