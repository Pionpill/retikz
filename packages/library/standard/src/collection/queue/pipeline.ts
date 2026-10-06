import type {
  CompositeCompileChild,
  IRPath,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, layoutLinearCells, createOperationArrow, linearDirectionVector } from '../_cell';
import { resolveQueue } from './resolve';
import type { IRQueue } from './schema';

/** 按队首到队尾排列，并下沉两端开放的边框与进出箭头 */
export const compileQueue = (source: IRQueue, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { namespace, type, items, layout, style, label, arrow, border, padding, ...scope } = resolveQueue(source);
  const input = typeof arrow === 'object' ? arrow.input : arrow;
  const output = typeof arrow === 'object' ? arrow.output : arrow;
  void namespace;
  void type;
  const { cells, width, height } = layoutLinearCells(items, { ...layout, padding, role: 'queue-cell' }, scope, context);
  const extra: Array<CompositeCompileChild> = [];
  if (border !== undefined) {
    const horizontal = layout.direction === 'left' || layout.direction === 'right';
    const path: IRPath = {
      ...border,
      type: 'path',
      children: horizontal
        ? [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [width, 0] },
            { type: 'step', kind: 'move', to: [0, height] },
            { type: 'step', kind: 'line', to: [width, height] },
          ]
        : [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, height] },
            { type: 'step', kind: 'move', to: [width, 0] },
            { type: 'step', kind: 'line', to: [width, height] },
          ],
    };
    extra.push(context.scope({}, [path]));
  }
  if (cells.length > 0) {
    const [dx, dy] = linearDirectionVector(layout.direction);
    const half = dx === 0 ? height / 2 : width / 2;
    const point = (distance: number): [number, number] => [width / 2 + dx * distance, height / 2 + dy * distance];
    if (input) extra.push(context.scope({}, [createOperationArrow(input, [point(half + 32), point(half + 8)])]));
    if (output) extra.push(context.scope({}, [createOperationArrow(output, [point(-half - 8), point(-half - 32)])]));
  }
  return compileCells(cells, { width, height, scope, extra, decoration: { label, style } }, context);
};
