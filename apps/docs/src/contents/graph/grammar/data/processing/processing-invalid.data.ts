export const cleanRows = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 132 },
  { month: 'Mar', revenue: 141 },
  { month: 'Apr', revenue: 138 },
  { month: 'May', revenue: 156 },
  { month: 'Jun', revenue: 172 },
];

export const dirtyRows = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 'bad' },
  { month: 'Mar' },
  { month: 'Apr', revenue: 138 },
  { month: 'May', revenue: null },
  { month: 'Jun', revenue: 172 },
];
