import type { IRScope } from '@retikz/core';

import type { TableBorderEdge } from '../layout';

import { emitTableBorderPath } from './emit';

/** 把 visible Border Graph edges 物化为 canonical Core Scope */
export const emitTableBorderScope = (edges: ReadonlyArray<TableBorderEdge>, tableId?: string): IRScope => ({
  type: 'scope',
  meta: { role: 'tableBorders' },
  children: edges.map(edge => emitTableBorderPath(edge, tableId)),
});
