import { isFiniteNumber } from '@retikz/math';

import type { ExternalRow } from '../../schemas';

import { resolveFieldPath } from '../data';

export type TransformRowGroup = {
  key: string;
  rows: Array<ExternalRow>;
  values: ExternalRow;
};

const groupKeyOf = (row: ExternalRow, fields: ReadonlyArray<string>): string =>
  JSON.stringify(fields.map(field => resolveFieldPath(row, field) ?? null));

export const groupRowsByFields = (
  rows: Array<ExternalRow>,
  fields: ReadonlyArray<string> = [],
): Array<TransformRowGroup> => {
  if (fields.length === 0) return [{ key: '__all__', rows, values: {} }];
  const groups = new Map<string, TransformRowGroup>();
  for (const row of rows) {
    const key = groupKeyOf(row, fields);
    const found = groups.get(key);
    if (found !== undefined) {
      found.rows.push(row);
      continue;
    }
    const values: ExternalRow = {};
    for (const field of fields) values[field] = resolveFieldPath(row, field);
    groups.set(key, { key, rows: [row], values });
  }
  return [...groups.values()];
};

export const finiteFieldValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const values: Array<number> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) values.push(value);
  }
  return values;
};

export const linearSamplesOf = (extent: readonly [number, number], sampleCount: number): Array<number> => {
  if (sampleCount === 2) return [extent[0], extent[1]];
  const step = (extent[1] - extent[0]) / (sampleCount - 1);
  return Array.from({ length: sampleCount }, (_, index) =>
    index === sampleCount - 1 ? extent[1] : extent[0] + step * index,
  );
};
