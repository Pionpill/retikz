import type { SemanticTableModel, TableLayoutManifest } from '../../contract';
import type { TableBorderEdge, TableLayout } from '../layout';

import { TableLayoutManifestSchema } from '../../contract';
import { deepFreeze } from '../../shared';

const alignmentError = (detail: string): never => {
  throw new Error(`table: internal cell alignment: ${detail}`);
};

/** 从 canonical model 与布局构造 detached、递归冻结的 manifest */
export const buildTableLayoutManifest = (
  tableId: string | undefined,
  model: SemanticTableModel,
  layout: TableLayout,
  borderEdges: ReadonlyArray<TableBorderEdge>,
): TableLayoutManifest =>
  deepFreeze(
    TableLayoutManifestSchema.parse({
      ...(tableId === undefined ? {} : { tableId }),
      allocationBounds: { ...layout.allocationBounds },
      visualOverflowBounds: { ...layout.visualOverflowBounds },
      rows: layout.rows.map(track => ({ ...track })),
      columns: layout.columns.map(track => ({ ...track })),
      cells: model.cells.map((cell, index) => {
        const geometry = layout.cells.at(index);
        if (geometry === undefined || geometry.cellId !== cell.id) {
          return alignmentError(`manifest Cell ${index} differs`);
        }
        return {
          cellId: cell.id,
          rowId: cell.rowId,
          columnId: cell.columnId,
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          span: { ...cell.span },
          box: { ...geometry.box },
          contentBox: { ...geometry.contentBox },
          sourceAllocationBounds: { ...geometry.sourceAllocationBounds },
          sourceVisualOverflowBounds: { ...geometry.sourceVisualOverflowBounds },
          contentAllocationBounds: { ...geometry.contentAllocationBounds },
          visualOverflowBounds: { ...geometry.visualOverflowBounds },
          location: cell.location,
          roles: [...cell.roles],
          ...(cell.source === undefined ? {} : { source: { ...cell.source } }),
        };
      }),
      borders: borderEdges.map(edge => ({
        edgeKey: edge.key,
        ...(tableId === undefined ? {} : { pathId: `${tableId}/border/${edge.key}` }),
        orientation: edge.orientation,
        start: { ...edge.start },
        end: { ...edge.end },
        style: edge.style,
        atoms: edge.atoms,
      })),
    }),
  );
