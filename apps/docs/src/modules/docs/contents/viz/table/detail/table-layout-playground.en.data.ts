import type { ExternalRow } from '@retikz/data';

/** Five-row dataset for the English Table detail layout playground */
export const tableLayoutPlaygroundRows: Array<ExternalRow> = [
  { name: 'Alpha', group: 'A', score: 92, status: 'Ready', note: 'Owns release verification.' },
  { name: 'Beta', group: 'B', score: 86, status: 'Review', note: 'Reviews API compatibility.' },
  { name: 'Gamma', group: 'A', score: 78, status: 'Draft', note: 'Tracks docs follow-ups.' },
  { name: 'Delta', group: 'C', score: 88, status: 'Ready', note: 'Maintains renderer fixtures.' },
  { name: 'Epsilon', group: 'B', score: 81, status: 'Blocked', note: 'Checks edge-case coverage.' },
];
