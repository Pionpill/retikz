import { formatLocale } from 'd3-format';
import { z } from 'zod';

import { defineCellFormatter } from '../../contract';
import { RetikzTableError } from '../../error';

const TABLE_NUMBER_LOCALE = formatLocale({
  decimal: '.',
  thousands: ',',
  grouping: [3],
  currency: ['$', ''],
  percent: '%',
  minus: '−',
  nan: 'NaN',
});

/** 使用固定 locale 的内置 number formatter */
export const NUMBER_CELL_FORMATTER = defineCellFormatter({
  name: 'number',
  optionsSchema: z.strictObject({
    specifier: z.string().optional(),
    nullText: z.string().optional(),
  }),
  format: ({ value }, options) => {
    if (value === null) return options.nullText ?? null;
    if (typeof value !== 'number') throw new RetikzTableError('number formatter requires a number or null value');
    return TABLE_NUMBER_LOCALE.format(options.specifier ?? '~g')(value);
  },
});
