import type { ExternalRow } from '@retikz/data';

/** 同组数值与交错行序用于比较分组结果 */
export const trendRowsOf = (): Array<ExternalRow> => [
  { team: 'A', x: 1, y: 3 },
  { team: 'B', x: 1, y: 8 },
  { team: 'A', x: 2, y: 6 },
  { team: 'B', x: 2, y: 12 },
  { team: 'A', x: 3, y: 11 },
  { team: 'B', x: 3, y: 18 },
];
