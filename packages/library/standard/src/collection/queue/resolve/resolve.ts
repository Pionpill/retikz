import { resolveBoxSpacing } from '@retikz/core';

import { expandLinearCells, resolveCell } from '../../_cell/resolve';
import { QueueBorderSchema, QueueLayoutSchema, QueueSchema } from '../schema';
import type { IRQueue } from '../schema';
import type { CanonicalQueue } from './types';

/** 展开三入口，合并单格继承并物化框的静态默认 */
export const resolveQueue = (source: IRQueue): CanonicalQueue => {
  const { items, data, dataExpand, skeleton, layout, border, padding, ...common } = source;
  const cells = items ?? expandLinearCells(data !== undefined ? { data, dataExpand } : { skeleton });
  const path = QueueBorderSchema.parse(typeof border === 'object' ? border : {});
  const style = QueueBorderSchema.shape.style.unwrap().parse(path.style ?? {});
  return {
    ...common,
    items: cells.map(cell => resolveCell(cell, { overallStyle: source.style, overallLayout: layout })),
    layout: QueueLayoutSchema.parse(layout ?? {}),
    padding: resolveBoxSpacing(padding ?? QueueSchema.options[0].shape.padding.parse(undefined), 0),
    ...(border === false ? {} : { border: { ...path, style } }),
  };
};
