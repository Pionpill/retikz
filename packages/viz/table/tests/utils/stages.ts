import type { AnyCellFormatterDefinition, SemanticTableModel } from '../../src';

import { formatTable } from '../../src/pipeline/formatter';
import { resolveTableCellPlans } from '../../src/pipeline/rule';

/** 以默认 resolved plans 驱动 formatter 阶段的测试 helper */
export const formatDefaultTable = (
  model: SemanticTableModel,
  formatterDefinitions?: ReadonlyArray<AnyCellFormatterDefinition>,
) =>
  formatTable(model, {
    cells: resolveTableCellPlans(model),
    ...(formatterDefinitions === undefined ? {} : { formatterDefinitions }),
  });
