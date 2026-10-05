import type {
  CompositeCompileChild,
  IRNode,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, measureCell, measureCellChild } from '../_cell';
import type { CellPlacement, MeasuredCell } from '../_cell';
import { ArrayDirection, ArrayIndexPosition } from './constants';
import { resolveArray } from './resolve';
import type { IRArray } from './schema';

/** 按轴累加单格尺寸与间距，内容只测量一次并复用 */
export const compileArray = (node: IRArray, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const {
    namespace: _namespace,
    type: _type,
    items,
    style,
    layout,
    index: indexOptions,
    label,
    ...scope
  } = resolveArray(node);
  void _namespace;
  void _type;
  if (items.length === 0)
    return compileCells([], { width: 0, height: 0, scope, decoration: { label, style } }, context);

  const { direction, gap } = layout;
  const horizontal = direction === ArrayDirection.Row;
  const measured: Array<MeasuredCell> = [];
  let width = 0;
  let height = 0;

  for (let index = 0; index < items.length; index++) {
    const cell = measureCell(items[index], context, index, scope);
    measured.push(cell);
    width = Math.max(width, cell.width);
    height = Math.max(height, cell.height);
  }

  const indices: Array<LayoutChildResult | undefined> = [];
  let hasIndices = false;
  let indexWidth = 0;
  let indexHeight = 0;
  if (indexOptions) {
    for (let index = 0; index < items.length; index++) {
      const text = indexOptions.labels === undefined ? String(indexOptions.start + index) : indexOptions.labels[index];
      if (text === '') {
        indices.push(undefined);
        continue;
      }

      hasIndices = true;
      const child: IRNode = {
        type: 'node',
        position: [0, 0],
        text,
        style: {
          fill: 'none',
          stroke: 'none',
          ...indexOptions.style,
        },
        layout: { padding: 0, margin: 0 },
      };
      const result = measureCellChild(context, child, items.length + index, scope);
      indices.push(result);
      indexWidth = Math.max(indexWidth, result.slotSize.width);
      indexHeight = Math.max(indexHeight, result.slotSize.height);
    }
  }

  const offset = hasIndices ? (horizontal ? indexHeight : indexWidth) + gap : 0;
  const isBefore = indexOptions && indexOptions.position === ArrayIndexPosition.Before;
  const cellOffset = isBefore ? offset : 0;
  const indexOffset = isBefore ? 0 : (horizontal ? height : width) + gap;
  const extra: Array<CompositeCompileChild> = [];
  let cursor = 0;
  const cells: Array<CellPlacement> = [];

  for (let index = 0; index < measured.length; index++) {
    const value = measured[index];
    const cellWidth =
      typeof value.cell.layout.width === 'number' || value.cell.layout.width === 'content' ? value.width : width;
    const cellHeight = typeof value.cell.layout.height === 'number' ? value.height : height;
    const placed: CellPlacement = {
      measured: value,
      x: horizontal ? cursor : cellOffset,
      y: horizontal ? cellOffset : cursor,
      width: cellWidth,
      height: cellHeight,
      role: 'array-cell',
    };

    const indexResult = indices[index];
    if (indexResult !== undefined)
      extra.push(
        context.replay(indexResult, {
          transforms: [
            {
              kind: 'translate',
              x:
                (horizontal ? cursor + cellWidth / 2 : indexOffset + indexWidth / 2) -
                indexResult.slotSize.width / 2 -
                indexResult.allocationBounds.x,
              y:
                (horizontal ? indexOffset + indexHeight / 2 : cursor + cellHeight / 2) -
                indexResult.slotSize.height / 2 -
                indexResult.allocationBounds.y,
            },
          ],
        }),
      );

    cursor += (horizontal ? cellWidth : cellHeight) + gap;
    cells.push(placed);
  }

  return compileCells(
    cells,
    {
      width: horizontal ? cursor - gap : width + offset,
      height: horizontal ? height + offset : cursor - gap,
      scope,
      extra,
      decoration: { label, style },
    },
    context,
  );
};
