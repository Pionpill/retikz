import type { LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { resolveMap } from '../../../resolve/map';
import { compileCells, measureCell } from '../shared/cell-layout';
import type { CellPlacement } from '../shared/cell-layout';
import type { IRMap } from './schemas';

/** 一次测量键值内容，按两列最大宽度与行高直接排布 */
export const compileMap = (node: IRMap, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { namespace: _namespace, type: _type, entries, style, layout, label, ...scope } = resolveMap(node);
  void _namespace;
  void _type;
  if (entries.length === 0) return compileCells([], 0, 0, scope, context, [], { label, style });
  const measured = entries
    .flatMap(entry => [entry.key, entry.value])
    .map((cell, index) => measureCell(cell, context, index, scope));
  const keyWidth = Math.max(...measured.filter((_, index) => index % 2 === 0).map(cell => cell.width));
  const valueWidth = Math.max(...measured.filter((_, index) => index % 2 === 1).map(cell => cell.width));
  const cells: Array<CellPlacement> = [];
  let y = 0;
  for (let index = 0; index < entries.length; index++) {
    const key = measured[index * 2];
    const value = measured[index * 2 + 1];
    const height = Math.max(key.height, value.height);
    cells.push({
      measured: key,
      x: 0,
      y,
      width: typeof key.cell.layout.width === 'number' ? key.width : keyWidth,
      height: typeof key.cell.layout.height === 'number' ? key.height : height,
      role: 'map-key',
    });
    cells.push({
      measured: value,
      x: keyWidth + layout.gap.column,
      y,
      width: typeof value.cell.layout.width === 'number' ? value.width : valueWidth,
      height: typeof value.cell.layout.height === 'number' ? value.height : height,
      role: 'map-value',
    });
    y += height + layout.gap.row;
  }
  return compileCells(cells, keyWidth + layout.gap.column + valueWidth, y - layout.gap.row, scope, context, [], {
    label,
    style,
  });
};
