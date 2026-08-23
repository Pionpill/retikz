import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import type {
  FormattedTableCell,
  FormattedTableModel,
  PresentedTableCell,
  PresentedTableModel,
  SemanticTableCell,
  TableCellContext,
} from '../../contract';
import type { PresentTableOptions, ResolvedTableCellPresentationInput } from './types';

import { RetikzTableError } from '../../error';
import { resolveCellPresentationRegistry } from '../../providers';
import {
  TableCellAppearanceSchema,
  TableCellPayloadKind,
  TableCellPresentation,
  TablePresentationRefSchema,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { applyTableCellContentStyle, parsePresentedChild, presentCellValue } from './present';

const ResolvedTableCellPresentationInputSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal(TableCellPayloadKind.Value),
    cellId: NonBlankStringSchema.optional(),
    presentation: TablePresentationRefSchema,
    appearance: TableCellAppearanceSchema,
  }),
  z.strictObject({
    kind: z.literal(TableCellPayloadKind.Content),
    cellId: NonBlankStringSchema.optional(),
    appearance: TableCellAppearanceSchema,
  }),
]);

/** 从 canonical Cell 构造 detached、递归冻结的 presentation context */
const presentationContextOf = (cell: SemanticTableCell): TableCellContext =>
  deepFreeze({
    ...(cell.id === undefined ? {} : { cellId: cell.id }),
    ...(cell.rowId === undefined ? {} : { rowId: cell.rowId }),
    ...(cell.columnId === undefined ? {} : { columnId: cell.columnId }),
    rowIndex: cell.rowIndex,
    columnIndex: cell.columnIndex,
    location: cell.location,
    roles: [...cell.roles],
    ...(cell.source === undefined ? {} : { source: { ...cell.source } }),
  });

/** 从 formatted / semantic model 构造本阶段默认 carrier */
const defaultCarrierOf = (
  formatted: FormattedTableCell,
  semantic: SemanticTableCell,
): ResolvedTableCellPresentationInput => {
  const appearance = TableCellAppearanceSchema.parse({
    ...(semantic.layout.borders === undefined ? {} : { borders: semantic.layout.borders }),
  });
  if (formatted.kind === TableCellPayloadKind.Content) {
    return deepFreeze({
      kind: TableCellPayloadKind.Content,
      ...(formatted.cellId === undefined ? {} : { cellId: formatted.cellId }),
      appearance,
    });
  }
  if (semantic.payload.kind !== TableCellPayloadKind.Value) {
    const cellLabel = formatted.cellId ?? `${semantic.rowIndex}:${semantic.columnIndex}`;
    throw new RetikzTableError(`table: presentation Cell "${cellLabel}" kind differs from semantic model`);
  }
  return deepFreeze({
    kind: TableCellPayloadKind.Value,
    ...(formatted.cellId === undefined ? {} : { cellId: formatted.cellId }),
    presentation: TablePresentationRefSchema.parse(
      semantic.payload.presentation ?? { name: TableCellPresentation.Text },
    ),
    appearance,
  });
};

/** 校验 supplied carrier 与 formatted / semantic Cells 同序，并校验显式 identity */
const resolvePresentationCarriers = (
  model: FormattedTableModel,
  cells: PresentTableOptions['cells'],
): ReadonlyArray<ResolvedTableCellPresentationInput> => {
  if (model.semantic.cells.length !== model.cells.length) {
    throw new RetikzTableError('table: presentation Cell count differs from semantic model');
  }
  if (cells !== undefined && cells.length !== model.cells.length) {
    throw new RetikzTableError('table: presentation carrier Cell count differs from formatted model');
  }
  return deepFreeze(
    model.cells.map((formatted, index) => {
      const semantic = model.semantic.cells[index];
      if (semantic.id !== formatted.cellId || semantic.payload.kind !== formatted.kind) {
        throw new RetikzTableError(`table: presentation Cell ${index} identity differs from formatted model`);
      }
      const carrier =
        cells === undefined
          ? defaultCarrierOf(formatted, semantic)
          : ResolvedTableCellPresentationInputSchema.parse(cells[index]);
      if (carrier.cellId !== formatted.cellId) {
        throw new RetikzTableError(`table: presentation carrier Cell ${index} identity differs from formatted model`);
      }
      if (carrier.kind !== formatted.kind) {
        throw new RetikzTableError(`table: presentation carrier Cell ${index} kind differs from formatted model`);
      }
      return carrier;
    }),
  );
};

/** 把 formatted Table Cells 呈现为同 identity、同顺序的 Core 内容 */
export const presentTable = (model: FormattedTableModel, options: PresentTableOptions = {}): PresentedTableModel => {
  const registry = resolveCellPresentationRegistry(options.presentationDefinitions);
  const carriers = resolvePresentationCarriers(model, options.cells);
  const cells: ReadonlyArray<PresentedTableCell> = model.cells.map((formatted, index) => {
    const semantic = model.semantic.cells[index];
    const carrier = carriers[index];
    if (formatted.kind === TableCellPayloadKind.Content && carrier.kind === TableCellPayloadKind.Content) {
      const content = applyTableCellContentStyle(parsePresentedChild(formatted.content), carrier.appearance.content);
      return {
        kind: TableCellPayloadKind.Content,
        ...(formatted.cellId === undefined ? {} : { cellId: formatted.cellId }),
        appearance: carrier.appearance,
        content,
      };
    }
    if (
      formatted.kind !== TableCellPayloadKind.Value ||
      carrier.kind !== TableCellPayloadKind.Value ||
      semantic.payload.kind !== TableCellPayloadKind.Value
    ) {
      throw new RetikzTableError(`table: presentation Cell ${index} kind differs from formatted model`);
    }
    const appearance = carrier.appearance;
    const content = applyTableCellContentStyle(
      presentCellValue(
        deepFreeze({
          rawValue: formatted.rawValue,
          value: formatted.value,
          context: presentationContextOf(semantic),
          appearance,
        }),
        carrier.presentation,
        registry,
      ),
      appearance.content,
    );
    return {
      kind: TableCellPayloadKind.Value,
      ...(formatted.cellId === undefined ? {} : { cellId: formatted.cellId }),
      rawValue: formatted.rawValue,
      value: formatted.value,
      formatterName: formatted.formatterName,
      presentationName: carrier.presentation.name,
      appearance,
      content,
    };
  });
  return deepFreeze({ semantic: model.semantic, cells });
};
