import type { SemanticTableModel, TableLayoutManifest } from '../../contract';
import type { TableLayout } from '../layout';

import { deepFreeze } from '../../shared';

const alignmentError = (detail: string): never => {
  throw new Error(`table: internal cell alignment: ${detail}`);
};

/** 从 canonical model 与布局构造 detached、递归冻结的 manifest */
export const buildTableLayoutManifest = (
  tableId: string | undefined,
  model: SemanticTableModel,
  layout: TableLayout,
): TableLayoutManifest =>
  deepFreeze({
    ...(tableId === undefined ? {} : { tableId }),
    bounds: { ...layout.bounds },
    rows: layout.rows.map(track => ({ ...track })),
    columns: layout.columns.map(track => ({ ...track })),
    cells: model.cells.map((cell, index) => {
      const geometry = layout.cells.at(index);
      if (geometry === undefined || geometry.cellId !== cell.id) {
        return alignmentError(`manifest Cell ${index} differs`);
      }
      return {
        cellId: cell.id,
        box: { ...geometry.box },
        location: cell.location,
        roles: [...cell.roles],
        ...(cell.source === undefined ? {} : { source: { ...cell.source } }),
      };
    }),
  });
