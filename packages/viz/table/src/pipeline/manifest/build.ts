import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import type {
  PresentedTableModel,
  SemanticTableModel,
  TableLayoutManifest,
  TableLegendDescriptor,
} from '../../contract';
import type { ResolvedTableThemeTokens } from '../../providers/style';
import type { TableBorderEdge, TableLayout } from '../layout';
import type { ResolvedTableCellPlan, ResolvedTableEncoding } from '../rule';

import { TableLayoutManifestSchema } from '../../contract';
import { RetikzTableError } from '../../error';
import { TableThemeTokenKeySchema } from '../../schemas';
import { deepFreeze } from '../../shared';

/** manifest 中的 style、plan 与 encoding lineage 输入 */
export type BuildTableManifestContext = Readonly<{
  /** 当前有效 Core Theme 的 style */
  style?: ThemeStyleValue;
  /** 当前有效 Core Theme 的 mode */
  themeMode: ThemeModeValue;
  /** 同次 resolved tokens */
  tableThemeTokens: ResolvedTableThemeTokens;
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

/** 从 canonical model 与布局构造 detached、递归冻结的 manifest */
export const buildTableLayoutManifest = (
  tableId: string | undefined,
  model: SemanticTableModel,
  layout: TableLayout,
  borderEdges: ReadonlyArray<TableBorderEdge>,
  manifestContext: BuildTableManifestContext,
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
          ...(presented.kind === 'value'
            ? { formatterName: presented.formatterName, presentationName: presented.presentationName }
            : {}),
          matchedRuleIndices: [...(plan?.trace.matchedRuleIndices ?? [])],
          encodingIds: [...(plan?.kind === 'value' ? (plan.trace.encodingIds ?? []) : [])],
          appearance: structuredClone(presented.appearance),
          appearanceTrace: Object.entries(trace)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([path, source]) => ({ path, source })),
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
        tokens: manifestContext.tableThemeTokens.tokens,
        sources: TableThemeTokenKeySchema.options.map(key => ({
          key,
          source: manifestContext.tableThemeTokens.sources[key].kind,
          path: manifestContext.tableThemeTokens.sources[key].path,
        })),
      },
      encodings: [...(manifestContext.encodings ?? [])],
      legendDescriptors: [...manifestContext.legendDescriptors],
    }),
  );
