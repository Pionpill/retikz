import type { IRManualTableCell } from '@retikz/table';

/** 中文 manual Table demo 的行优先 Cell 内容 */
export const manualRows: Array<Array<IRManualTableCell | null>> = [
  ['状态', '数量'],
  ['完成', { value: 18, layout: { horizontalAlign: 'end' } }],
  [null, 4],
  ['空值', { value: null }],
];
