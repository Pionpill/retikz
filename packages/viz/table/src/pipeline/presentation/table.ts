import type { AnyCellPresentationDefinition, PresentedTableModel, SemanticTableModel } from '../../contract';

import { resolveCellPresentationRegistry } from '../../providers';
import { deepFreeze } from '../../shared';
import { presentCellPayload } from './present';

/** 把 canonical Table Cells 呈现为同 identity、同顺序的 Core 内容 */
export const presentTable = (
  model: SemanticTableModel,
  definitions?: ReadonlyArray<AnyCellPresentationDefinition>,
): PresentedTableModel => {
  const registry = resolveCellPresentationRegistry(definitions);
  return deepFreeze({
    semantic: model,
    cells: model.cells.map(cell => ({
      cellId: cell.id,
      content: presentCellPayload(cell.payload, cell.id, registry),
    })),
  });
};
