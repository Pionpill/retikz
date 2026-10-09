import { strictObject } from 'zod';

import { defineCellFormatter } from '../../contract';
import { BuiltinTableCellFormatter } from '../../schemas';

/** 保留 canonical scalar 的内置 identity formatter */
export const IDENTITY_CELL_FORMATTER = defineCellFormatter({
  name: BuiltinTableCellFormatter.Identity,
  optionsSchema: strictObject({}),
  format: ({ value }) => value,
});
