import type { ExternalRow } from '@retikz/data';

/** 交错分组、重复商品及并列数值的共享样本，record 唯一标识每条记录 */
export const rowOrganizationRowsOf = (): Array<ExternalRow> => [
  { team: 'A', item: 'phone', record: 'r1', value: 10 },
  { team: 'B', item: 'phone', record: 'r2', value: 60 },
  { team: 'A', item: 'book', record: 'r3', value: 30 },
  { team: 'B', item: 'book', record: 'r4', value: 5 },
  { team: 'A', item: 'phone', record: 'r5', value: 40 },
  { team: 'B', item: 'phone', record: 'r6', value: 20 },
  { team: 'A', item: 'book', record: 'r7', value: 30 },
  { team: 'B', item: 'book', record: 'r8', value: 35 },
];

/** 将文档控件选项映射为公开分组字段列表 */
export const rowOrganizationGroupByOf = (group: string): Array<string> => {
  if (group === 'team-item') return ['team', 'item'];
  if (group === 'team' || group === 'item') return [group];
  return [];
};
