import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';
import type { output as ZodOutput } from 'zod';

import type {
  PresentedTableModel,
  SemanticTableModel,
  TableCellAppearanceTracePathValue,
  TableLayoutManifestSchema,
  TableLegendDescriptor,
} from '../../contract';
import type { TableBorderEdge, TableLayout } from '../layout';
import type { ResolvedTableCellPlan, ResolvedTableDefaults, ResolvedTableEncoding } from '../rule';

import { RetikzTableError } from '../../error';

/** manifest 中的 style、plan 与 encoding lineage 输入 */
export type BuildTableManifestContext = Readonly<{
  /** 当前有效 Core Theme 的 style */
  style?: ThemeStyleValue;
  /** 当前有效 Core Theme 的 mode */
  themeMode: ThemeModeValue;
  /** 同次 resolved Table defaults */
  tableDefaults: ResolvedTableDefaults;
  /** 同次 presented model */
  presented: PresentedTableModel;
  /** 可选同次 resolved Cell plans */
  plans?: ReadonlyArray<ResolvedTableCellPlan>;
  /** 同次 ordered encoding seed */
  encodings?: ReadonlyArray<ResolvedTableEncoding>;
  /** 同次 visual scale resolutions 产出的 Legend descriptor seed */
  legendDescriptors: ReadonlyArray<TableLegendDescriptor>;
}>;

const alignmentError = (detail: string): never => {
  throw new RetikzTableError(`table: internal cell alignment: ${detail}`);
};

/** 从 canonical model 与布局构造待 artifact schema 接纳的 manifest candidate */
export const buildTableLayoutManifest = (
  tableId: string | undefined,
  model: SemanticTableModel,
  layout: TableLayout,
  borderEdges: ReadonlyArray<TableBorderEdge>,
  manifestContext: BuildTableManifestContext,
): ZodOutput<typeof TableLayoutManifestSchema> =>
  ({
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
      const presented = manifestContext.presented.cells.at(index);
      if (presented === undefined || presented.cellId !== cell.id) {
        return alignmentError(`manifest presented Cell ${index} differs`);
      }
      const plan = manifestContext.plans?.at(index);
      if (plan !== undefined && plan.cellId !== cell.id) {
        return alignmentError(`manifest plan Cell ${index} differs`);
      }
      const trace = plan?.trace.appearance ?? {};
      return {
        ...(cell.id === undefined ? {} : { cellId: cell.id }),
        ...(cell.rowId === undefined ? {} : { rowId: cell.rowId }),
        ...(cell.columnId === undefined ? {} : { columnId: cell.columnId }),
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
        ...(presented.kind === 'value'
          ? { formatterName: presented.formatterName, presentationName: presented.presentationName }
          : {}),
        matchedRuleIndices: [...(plan?.trace.matchedRuleIndices ?? [])],
        encodingIds: [...(plan?.kind === 'value' ? (plan.trace.encodingIds ?? []) : [])],
        appearance: structuredClone(presented.appearance),
        appearanceTrace: (Object.keys(trace) as Array<TableCellAppearanceTracePathValue>)
          .sort((left, right) => left.localeCompare(right))
          .flatMap(path => {
            const source = trace[path];
            return source === undefined ? [] : [{ path, source }];
          }),
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
    style: {
      ...(manifestContext.style === undefined ? {} : { style: manifestContext.style }),
      themeMode: manifestContext.themeMode,
      defaults: structuredClone(manifestContext.tableDefaults.defaults),
      layers: structuredClone(manifestContext.tableDefaults.layers),
    },
    encodings: [...(manifestContext.encodings ?? [])],
    legendDescriptors: [...manifestContext.legendDescriptors],
  }) as ZodOutput<typeof TableLayoutManifestSchema>;
