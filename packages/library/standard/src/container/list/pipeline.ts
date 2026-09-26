import type {
  CompositeCompileChild,
  IRNode,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, measureCell, measureCellChild } from '../shared/cell-layout';
import type { CellPlacement } from '../shared/cell-layout';
import { ListDirection, ListIndexPosition } from './constants';
import { resolveList } from './resolve';
import type { IRList } from './schema';

/** 按轴累加单格尺寸与间距，内容只测量一次并复用 */
export const compileList = (node: IRList, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const {
    namespace: _namespace,
    type: _type,
    items,
    style,
    layout,
    index: indexOptions,
    label,
    ...scope
  } = resolveList(node);
  void _namespace;
  void _type;
  if (items.length === 0) return compileCells([], 0, 0, scope, context, [], { label, style });
  const { direction, gap } = layout;
  const horizontal = direction === ListDirection.Row;
  const measured = items.map((cell, index) => measureCell(cell, context, index, scope));
  const width = Math.max(...measured.map(cell => cell.width));
  const height = Math.max(...measured.map(cell => cell.height));
  const indices = indexOptions
    ? items.map((_, index) => {
        const child: IRNode = {
          type: 'node',
          position: [0, 0],
          text: String(indexOptions.start + index),
          style: {
            fill: 'none',
            stroke: 'none',
            ...indexOptions.style,
          },
          layout: { padding: 0, margin: 0 },
        };
        return measureCellChild(context, child, items.length + index, scope);
      })
    : [];
  const indexWidth = Math.max(0, ...indices.map(index => index.slotSize.width));
  const indexHeight = Math.max(0, ...indices.map(index => index.slotSize.height));
  const offset = indexOptions ? (horizontal ? indexHeight : indexWidth) + gap : 0;
  const isBefore = indexOptions && indexOptions.position === ListIndexPosition.Before;
  const cellOffset = isBefore ? offset : 0;
  const indexOffset = isBefore ? 0 : (horizontal ? height : width) + gap;
  const extra: Array<CompositeCompileChild> = [];
  let cursor = 0;
  const cells: Array<CellPlacement> = measured.map((value, index) => {
    const cellWidth =
      typeof value.cell.layout.width === 'number' || value.cell.layout.width === 'content' ? value.width : width;
    const cellHeight = typeof value.cell.layout.height === 'number' ? value.height : height;
    const placed: CellPlacement = {
      measured: value,
      x: horizontal ? cursor : cellOffset,
      y: horizontal ? cellOffset : cursor,
      width: cellWidth,
      height: cellHeight,
      role: 'list-cell',
    };
    const indexResult = indices[index];
    if (indexOptions)
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
    return placed;
  });
  return compileCells(
    cells,
    horizontal ? cursor - gap : width + offset,
    horizontal ? height + offset : cursor - gap,
    scope,
    context,
    extra,
    { label, style },
  );
};
