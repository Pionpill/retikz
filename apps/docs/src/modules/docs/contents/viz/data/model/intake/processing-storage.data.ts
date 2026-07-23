export const canonicalRows = [
  { month: '2026-01-01', revenue: 120 },
  { month: '2026-02-01', revenue: 132 },
  { month: '2026-03-01', revenue: 141 },
  { month: '2026-04-01', revenue: 138 },
  { month: '2026-05-01', revenue: 156 },
  { month: '2026-06-01', revenue: 172 },
];

export const mixedRows = [
  { month: new Date('2026-01-01T00:00:00Z'), revenue: '119' },
  { month: Date.UTC(2026, 1, 1), revenue: 131 },
  { month: '2026-03-01', revenue: '145' },
  { month: new Date('2026-04-01T00:00:00Z'), revenue: 142 },
  { month: Date.UTC(2026, 4, 1), revenue: '166' },
  { month: '2026-06-01', revenue: 178 },
];
