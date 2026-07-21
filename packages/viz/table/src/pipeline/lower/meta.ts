import type { IRJsonObject } from '@retikz/core';

import type { SemanticTableCell } from '../../contract';

import { TableCellSourceKind } from '../../contract';

/** 构造不含原始值的最小 Cell Core meta */
export const tableCellMetaOf = (cell: SemanticTableCell): IRJsonObject => ({
  role: 'tableCell',
  cellId: cell.id,
  location: cell.location,
  ...(cell.source?.kind === TableCellSourceKind.Field
    ? {
        reference: cell.source.reference,
        sourceIndex: cell.source.sourceIndex,
        field: cell.source.field,
      }
    : {}),
});
