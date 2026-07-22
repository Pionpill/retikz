import type { IRTableCell } from '@retikz/table';

/** 中文 manual Table demo 的显式 Cell 内容 */
export const manualCells: Array<IRTableCell> = [
  { address: { row: 0, column: 0 }, payload: { kind: 'value', value: '状态' } },
  { address: { row: 0, column: 1 }, payload: { kind: 'value', value: '数量' } },
  { address: { row: 1, column: 0 }, payload: { kind: 'value', value: '完成' } },
  { address: { row: 1, column: 1 }, payload: { kind: 'value', value: 18 } },
  { address: { row: 2, column: 0 }, payload: { kind: 'value', value: '待处理' } },
  { address: { row: 2, column: 1 }, payload: { kind: 'value', value: 4 } },
];
