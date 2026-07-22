import { z } from 'zod';

import { defineCellPresentation } from '../../contract';

/** 内置 text Cell presentation */
export const TEXT_CELL_PRESENTATION = defineCellPresentation({
  name: 'text',
  optionsSchema: z.strictObject({}),
  present: ({ value }) => ({
    type: 'node',
    position: [0, 0],
    text: value === null ? '' : String(value),
    stroke: 'none',
    fill: 'none',
    padding: 0,
  }),
});
