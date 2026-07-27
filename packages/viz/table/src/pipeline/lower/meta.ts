import type { IRJsonObject } from '@retikz/core';

import type { TableBorderPathMeta } from '../../contract';
import type { SemanticTableCell } from '../../contract';
import type { TableBorderEdge } from '../layout';

import { TableCellSourceKind } from '../../contract';

/** 构造不含原始值的最小 Cell Core meta */
export const tableCellMetaOf = (cell: SemanticTableCell): IRJsonObject => ({
  role: 'tableCell',
  cellId: cell.id,
  rowIndex: cell.rowIndex,
  columnIndex: cell.columnIndex,
  span: { ...cell.span },
  location: cell.location,
  roles: [...cell.roles],
  ...(cell.source?.kind === TableCellSourceKind.Field
    ? {
        reference: cell.source.reference,
        sourceIndex: cell.source.sourceIndex,
        field: cell.source.field,
      }
    : {}),
});

/** 构造 Border Path 的稳定 JSON provenance */
export const tableBorderPathMetaOf = (edge: TableBorderEdge, tableId?: string): TableBorderPathMeta => ({
  kind: 'tableBorder',
  ...(tableId === undefined ? {} : { tableId }),
  edgeKey: edge.key,
  atomicKeys: edge.atoms.map(atom => atom.key),
});
