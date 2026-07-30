import type { IRManualTableCell } from '@retikz/table';

/** 英文 manual Table demo 的行优先 Cell 内容 */
export const manualRows: Array<Array<IRManualTableCell | null>> = [
  ['Status', 'Count'],
  ['Done', { value: 18, layout: { horizontalAlign: 'end' } }],
  [null, 4],
  ['Null value', { value: null }],
];
