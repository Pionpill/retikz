import type { LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { compileCells, measureCell } from '../_cell';
import type { CellPlacement } from '../_cell';
import { resolveMap } from './resolve';
import type { IRMap } from './schema';

/** 一次测量键值内容，按两列最大宽度与行高直接排布 */
export const compileMap = (node: IRMap, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { namespace: _namespace, type: _type, entries, style, layout, label, ...scope } = resolveMap(node);
  void _namespace;
  void _type;
  if (entries.length === 0)
    return compileCells([], { width: 0, height: 0, scope, decoration: { label, style } }, context);
  const measured = entries
    .flatMap(entry => [entry.key, entry.value])
    .map((cell, index) => measureCell(cell, context, index, scope));
  const { keyWidth, valueWidth } = measured.reduce(
    (widths, cell, index) => {
      if (index % 2 === 0) widths.keyWidth = Math.max(widths.keyWidth, cell.width);
      else widths.valueWidth = Math.max(widths.valueWidth, cell.width);
      return widths;
    },
    { keyWidth: 0, valueWidth: 0 },
  );
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
  return compileCells(
    cells,
    {
      width: keyWidth + layout.gap.column + valueWidth,
      height: y - layout.gap.row,
      scope,
      decoration: { label, style },
    },
    context,
  );
};
