import type { IRNode, IRScope } from '@retikz/core';

import type { PresentedTableCell, SemanticTableCell } from '../../contract';
import type { TableCellLayout, TableLayout } from '../layout';

import { tableCellMetaOf } from './meta';

/** 让固定轨道 Table bounds 参与 Core Scene AABB */
export const emitTableBoundsSentinel = (layout: TableLayout): IRNode => ({
  type: 'node',
  position: [layout.bounds.x + layout.bounds.width / 2, layout.bounds.y + layout.bounds.height / 2],
  shape: 'rectangle',
  minimumSize: { width: layout.bounds.width, height: layout.bounds.height },
  padding: 0,
  fill: 'none',
  stroke: 'none',
  opacity: 0,
  meta: { role: 'tableBounds' },
});

/** 把单个 Presented Cell 放到对应固定轨道中心 */
export const emitTableCell = (
  semantic: SemanticTableCell,
  presented: PresentedTableCell,
  layout: TableCellLayout,
): IRScope => ({
  type: 'scope',
  transforms: [{ kind: 'translate', x: layout.contentCenter[0], y: layout.contentCenter[1] }],
  meta: tableCellMetaOf(semantic),
  children: [presented.content],
});
