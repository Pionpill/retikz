/** 已使用标准存储形态的数据 */
export const canonicalRows = [
  { month: '2026-01-01', revenue: 120 },
  { month: '2026-02-01', revenue: 132 },
  { month: '2026-03-01', revenue: 141 },
  { month: '2026-04-01', revenue: 138 },
  { month: '2026-05-01', revenue: 156 },
  { month: '2026-06-01', revenue: 172 },
];

/** 可由内置转换统一的混合存储形态 */
export const mixedRows = [
  { month: new Date('2026-01-01T00:00:00Z'), revenue: '119' },
  { month: Date.UTC(2026, 1, 1), revenue: 131 },
  { month: '2026-03-01', revenue: '145' },
  { month: new Date('2026-04-01T00:00:00Z'), revenue: 142 },
  { month: Date.UTC(2026, 4, 1), revenue: '166' },
  { month: '2026-06-01', revenue: 178 },
];

/** 需要声明式格式解析的报表数据 */
export const reportRows = [
  { month: '2026/01/01', revenue: '62%' },
  { month: '2026/02/01', revenue: '65%' },
  { month: '2026/03/01', revenue: '68%' },
  { month: '2026/04/01', revenue: '64%' },
  { month: '2026/05/01', revenue: '71%' },
  { month: '2026/06/01', revenue: '74%' },
];
