import { strictObject } from 'zod';

import { defineCellPresentation } from '../../contract';
import { BuiltinTableCellPresentation } from '../../schemas';

/** 内置 text Cell presentation */
export const TEXT_CELL_PRESENTATION = defineCellPresentation({
  name: BuiltinTableCellPresentation.Text,
  optionsSchema: strictObject({}),
  present: ({ value }) => ({
    type: 'node',
    position: [0, 0],
    text: value === null ? '' : String(value),
    style: { stroke: 'none', fill: 'none' },
    layout: { padding: 0 },
  }),
});
