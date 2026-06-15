/** demo data: daily visits for explicit <Scale> and fieldMap examples */
export const visits: Array<Record<string, string | number>> = [
  { date: '2024-01-01', value: 120 },
  { date: '2024-02-01', value: 180 },
  { date: '2024-03-01', value: 150 },
  { date: '2024-04-01', value: 240 },
  { date: '2024-05-01', value: 310 },
];

/** demo data: real source field names differ from the logical chart fields */
export const renamedVisits: Array<Record<string, string | number>> = [
  { period: '2024-01-01', amount: 120 },
  { period: '2024-02-01', amount: 180 },
  { period: '2024-03-01', amount: 150 },
  { period: '2024-04-01', amount: 240 },
  { period: '2024-05-01', amount: 310 },
];
