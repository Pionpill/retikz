import type { AnyCellPresentationDefinition, FormattedTableModel, PresentedTableModel } from '../../contract';

import { resolveCellPresentationRegistry } from '../../providers';
import { TableCellPayloadKind } from '../../schemas';
import { deepFreeze } from '../../shared';
import { presentCellPayload } from './present';

/** 把 formatted Table Cells 呈现为同 identity、同顺序的 Core 内容 */
export const presentTable = (
  model: FormattedTableModel,
  definitions?: ReadonlyArray<AnyCellPresentationDefinition>,
): PresentedTableModel => {
  const registry = resolveCellPresentationRegistry(definitions);
  if (model.semantic.cells.length !== model.cells.length) {
    throw new Error('table: presentation Cell count differs from semantic model');
  }
  return deepFreeze({
    semantic: model.semantic,
    cells: model.cells.map((cell, index) => {
      const semantic = model.semantic.cells[index];
      if (semantic.id !== cell.cellId || semantic.payload.kind !== cell.kind) {
        throw new Error(`table: presentation Cell ${index} identity differs from formatted model`);
      }
      const payload =
        cell.kind === TableCellPayloadKind.Content
          ? { kind: TableCellPayloadKind.Content, content: cell.content }
          : {
              kind: TableCellPayloadKind.Value,
              value: cell.value,
              ...(semantic.payload.kind === TableCellPayloadKind.Value && semantic.payload.presentation !== undefined
                ? { presentation: semantic.payload.presentation }
                : {}),
            };
      return {
        cellId: cell.cellId,
        content: presentCellPayload(payload, cell.cellId, registry),
      };
    }),
  });
};
