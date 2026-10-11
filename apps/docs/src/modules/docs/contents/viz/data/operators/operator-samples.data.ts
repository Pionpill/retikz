import type { ExternalRow } from '@retikz/data';

/** 各算子比较使用同一批订单，包含并列收入和一条偏大的收入 */
export const operatorSamples: Array<ExternalRow> = [
  { team: 'A', item: 'a1', value: 10 },
  { team: 'A', item: 'a2', value: 20 },
  { team: 'A', item: 'a3', value: 20 },
  { team: 'A', item: 'a4', value: 90 },
  { team: 'B', item: 'b1', value: 5 },
  { team: 'B', item: 'b2', value: 15 },
  { team: 'B', item: 'b3', value: 15 },
  { team: 'B', item: 'b4', value: 25 },
];

/** 调整 a4 的收入，其它记录保持不变 */
export const operatorSamplesOf = (tail: number = 90): Array<ExternalRow> =>
  operatorSamples.map(row => (row.item === 'a4' ? { ...row, value: tail } : row));
