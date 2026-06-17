import type { DataModel } from '@retikz/plot';

export type CrossRow = {
  kind: string;
  label: string;
  value: number;
  x: number;
};

export const crossRows: Array<CrossRow> = [
  { label: 'row A', x: 1, value: 20, kind: 'anchor' },
  { label: 'row B', x: 2, value: 70, kind: 'anchor' },
  { label: 'row C', x: 3, value: 45, kind: 'anchor' },
];

export const crossModel: DataModel = [
  { name: 'x', type: 'continuous' },
  { name: 'value', type: 'continuous' },
  { name: 'kind', type: 'categorical' },
];
