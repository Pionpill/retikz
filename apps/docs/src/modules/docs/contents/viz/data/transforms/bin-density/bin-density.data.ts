import type { ExternalRow } from '@retikz/data';

/** 同组数值与交错行序用于比较分组结果 */
export const distributionRowsOf = (): Array<ExternalRow> => [
  { team: 'A', value: 10 },
  { team: 'B', value: 25 },
  { team: 'A', value: 20 },
  { team: 'B', value: 40 },
  { team: 'A', value: 30 },
  { team: 'B', value: 50 },
];
