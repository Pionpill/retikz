import type { ExternalRow } from '@retikz/data';

/** 同组数值与交错行序用于比较分组结果 */
export const numericRowsOf = (): Array<ExternalRow> => [
  { team: 'A', item: 'book', value: 10 },
  { team: 'B', item: 'phone', value: 5 },
  { team: 'A', item: 'phone', value: 20 },
  { team: 'B', item: 'book', value: 15 },
  { team: 'A', item: 'book', value: 30 },
  { team: 'B', item: 'phone', value: 25 },
];

/** 将控件选项映射为计算分组 */
export const groupFieldsOf = (group: string): Array<string> =>
  group === 'team-item' ? ['team', 'item'] : group === 'team' || group === 'item' ? [group] : [];
