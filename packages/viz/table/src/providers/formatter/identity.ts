import { z } from 'zod';

import { defineCellFormatter } from '../../contract';
import { TableCellFormatter } from '../../schemas';

/** 保留 canonical scalar 的内置 identity formatter */
export const IDENTITY_CELL_FORMATTER = defineCellFormatter({
  name: TableCellFormatter.Identity,
  optionsSchema: z.strictObject({}),
  format: ({ value }) => value,
});
