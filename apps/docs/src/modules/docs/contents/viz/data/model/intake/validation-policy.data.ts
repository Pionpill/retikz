/** 全部有效的数据 */
export const cleanRows = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 132 },
  { month: 'Mar', revenue: 141 },
  { month: 'Apr', revenue: 138 },
  { month: 'May', revenue: 156 },
  { month: 'Jun', revenue: 172 },
];

/** 同时包含有效值与非法值的数据 */
export const dirtyRows = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 'bad' },
  { month: 'Mar' },
  { month: 'Apr', revenue: 138 },
  { month: 'May', revenue: null },
  { month: 'Jun', revenue: 172 },
];

/** 目标字段没有任何有效样本的数据 */
export const allInvalidRows = [
  { month: 'Jan', revenue: 'bad' },
  { month: 'Feb', revenue: null },
  { month: 'Mar' },
  { month: 'Apr', revenue: 'n/a' },
];
