import type {
  CompositeCompileChild,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, measureCell } from '../_cell';
import type { CellPlacement, MeasuredCell } from '../_cell';
import { measureCollectionIndex } from '../_index';
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

  /** 每格只测量一次，以各列最大宽度、各行最大高度确定共享轨道，保留测量结果供后续放置复用 */
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

  /** 测量行列索引并预留侧边空间；空标签保留索引位置，仅有可见标签时计入索引与网格之间的间距 */
  const axisResults: { row: Array<LayoutChildResult | undefined>; column: Array<LayoutChildResult | undefined> } = {
    row: [],
    column: [],
  };
  const strips = { row: 0, column: 0 };
  /** 索引子项的 occurrence 接续单元格序号，避免与已测量的单元格重复 */
  let occurrence = rows * columns;

  for (const axis of ['row', 'column'] as const) {
    const options = index[axis];
    if (!options) continue;

    let visible = false;

    for (let i = 0; i < (axis === 'row' ? rows : columns); i++) {
      const result = measureCollectionIndex(options, i, occurrence, scope, context);
      if (result === undefined) {
        axisResults[axis].push(undefined);
        continue;
      }

      occurrence++;
      axisResults[axis].push(result);
      visible = true;
      strips[axis] = Math.max(strips[axis], axis === 'row' ? result.slotSize.width : result.slotSize.height);
    }

    if (visible) strips[axis] += axis === 'row' ? layout.gap.column : layout.gap.row;
  }

  /** 汇总轨道与内部间距得到网格尺寸；前置索引占用的空间转为网格起点偏移 */
  const gridWidth = widths.reduce((sum, value) => sum + value, 0) + (columns - 1) * layout.gap.column;
  const gridHeight = heights.reduce((sum, value) => sum + value, 0) + (rows - 1) * layout.gap.row;
  const xOffset = index.row && index.row.position === 'before' ? strips.row : 0;
  const yOffset = index.column && index.column.position === 'before' ? strips.column : 0;
  const cells: Array<CellPlacement> = [],
    extra: Array<CompositeCompileChild> = [];
  let y = yOffset;

  /** 按共享轨道推进坐标；显式指定宽高的单元格保留测量尺寸，其余单元格填满对应轨道 */
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

  /** 将索引居中放入对应轨道及侧边空间，扣除测量边界原点偏移后回放，避免重复编译 */
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

  /** 合并单元格、索引及整体装饰，矩阵总尺寸包含两类索引各自预留的空间 */
  return compileCells(
    cells,
    { width: gridWidth + strips.row, height: gridHeight + strips.column, scope, extra, decoration: { label, style } },
    context,
  );
};
