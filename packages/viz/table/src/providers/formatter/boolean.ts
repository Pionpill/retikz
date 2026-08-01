import { z } from 'zod';

import { defineCellFormatter } from '../../contract';

/** 把 boolean 映射为显式标签的内置 formatter */
export const BOOLEAN_CELL_FORMATTER = defineCellFormatter({
  name: 'boolean',
  optionsSchema: z.strictObject({
    trueText: z.string().optional(),
    falseText: z.string().optional(),
    nullText: z.string().optional(),
  }),
  format: ({ value }, options) => {
    if (value === null) return options.nullText ?? null;
    if (typeof value !== 'boolean') throw new Error('boolean formatter requires a boolean or null value');
    return value ? (options.trueText ?? 'true') : (options.falseText ?? 'false');
  },
});
