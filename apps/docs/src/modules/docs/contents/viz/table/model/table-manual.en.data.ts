import type { IRTableCell } from '@retikz/table';

/** 英文 manual Table demo 的显式 Cell 内容 */
export const manualCells: Array<IRTableCell> = [
  { address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Status' } },
  { address: { row: 0, column: 1 }, payload: { kind: 'value', value: 'Count' } },
  { address: { row: 1, column: 0 }, payload: { kind: 'value', value: 'Done' } },
  { address: { row: 1, column: 1 }, payload: { kind: 'value', value: 18 } },
  { address: { row: 2, column: 0 }, payload: { kind: 'value', value: 'Pending' } },
  { address: { row: 2, column: 1 }, payload: { kind: 'value', value: 4 } },
];
