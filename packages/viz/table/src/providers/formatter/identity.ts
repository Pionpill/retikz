import { z } from 'zod';

import { defineCellFormatter } from '../../contract';

/** 保留 canonical scalar 的内置 identity formatter */
export const IDENTITY_CELL_FORMATTER = defineCellFormatter({
  name: 'identity',
  optionsSchema: z.strictObject({}),
  format: ({ value }) => value,
});
