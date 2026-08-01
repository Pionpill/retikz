import type { IRNode, IRPath } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';

import { PaintValueSchema } from '@retikz/core';

import type { IRTableCellBackground } from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type { TableBorderEdge } from '../layout';
import type { TableLayout } from '../layout';

import { TableBorderPathMetaSchema } from '../../contract';
import { tableBorderPathMetaOf } from './meta';

/** 让 Table allocation bounds 参与 Core Scene AABB */
export const emitTableBoundsSentinel = (layout: Pick<TableLayout, 'allocationBounds'>): IRNode => ({
  type: 'node',
  position: [
    layout.allocationBounds.x + layout.allocationBounds.width / 2,
    layout.allocationBounds.y + layout.allocationBounds.height / 2,
  ],
  shape: 'rectangle',
  minimumSize: { width: layout.allocationBounds.width, height: layout.allocationBounds.height },
  padding: 0,
  fill: 'none',
  stroke: 'none',
  opacity: 0,
  meta: { role: 'tableBounds' },
});

/** 把可见 Cell box 背景下沉为无描边的闭合 Core Path */
export const emitTableCellBackground = (
  background: DeepReadonly<IRTableCellBackground> | undefined,
  box: BoundsRect,
): IRPath | undefined => {
  if (
    background === undefined ||
    background.fill === 'none' ||
    (background.fillOpacity ?? 1) === 0 ||
    box.width === 0 ||
    box.height === 0
  ) {
    return undefined;
  }
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  return {
    type: 'path',
    fill: PaintValueSchema.parse(background.fill),
    fillOpacity: background.fillOpacity ?? 1,
    stroke: 'none',
    strokeOpacity: 0,
    children: [
      { type: 'step', kind: 'move', to: [box.x, box.y] },
      { type: 'step', kind: 'line', to: [right, box.y] },
      { type: 'step', kind: 'line', to: [right, bottom] },
      { type: 'step', kind: 'line', to: [box.x, bottom] },
      { type: 'step', kind: 'cycle' },
    ],
  };
};

/** 把 resolved border edge 下沉为普通 Core Path */
export const emitTableBorderPath = (edge: TableBorderEdge, tableId?: string): IRPath => ({
  type: 'path',
  ...(tableId === undefined ? {} : { id: `${tableId}/border/${edge.key}` }),
  fill: 'none',
  stroke: PaintValueSchema.parse(edge.style.stroke),
  strokeWidth: edge.style.width,
  strokeOpacity: edge.style.strokeOpacity,
  ...(edge.style.dashPattern === undefined ? {} : { dashPattern: [...edge.style.dashPattern] }),
  dashOffset: edge.style.dashOffset,
  lineCap: edge.style.lineCap,
  lineJoin: edge.style.lineJoin,
  meta: TableBorderPathMetaSchema.parse(tableBorderPathMetaOf(edge, tableId)),
  children: [
    { type: 'step', kind: 'move', to: [edge.start.x, edge.start.y] },
    { type: 'step', kind: 'line', to: [edge.end.x, edge.end.y] },
  ],
});
