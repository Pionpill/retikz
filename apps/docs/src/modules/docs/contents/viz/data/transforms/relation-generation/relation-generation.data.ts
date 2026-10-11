import type { ExternalRow } from '@retikz/data';

/** 同组数值与交错行序用于比较分组结果 */
export const relationRowsOf = (): Array<ExternalRow> => [
  { team: 'A', record: 'a1', value: 30 },
  { team: 'B', record: 'b1', value: 15 },
  { team: 'A', record: 'a2', value: 10 },
  { team: 'B', record: 'b2', value: 5 },
  { team: 'A', record: 'a3', value: 20 },
  { team: 'B', record: 'b3', value: 45 },
];
