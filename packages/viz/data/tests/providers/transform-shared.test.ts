import type { ExternalRow } from '@retikz/data';

import { finiteFieldValuesOf, groupRowsByFields, linearSamplesOf } from '@retikz/data';
import { describe, expect, it } from 'vitest';

describe('transform shared helpers', () => {
  it('groups rows by field values while preserving first-seen group order and key values', () => {
    const rows: Array<ExternalRow> = [
      { region: 'north', series: 'A', value: 1 },
      { region: 'south', series: 'A', value: 2 },
      { region: 'north', series: 'A', value: 3 },
      { region: 'north', series: 'B', value: 4 },
    ];

    const groups = groupRowsByFields(rows, ['region', 'series']);

    expect(groups.map(group => group.values)).toEqual([
      { region: 'north', series: 'A' },
      { region: 'south', series: 'A' },
      { region: 'north', series: 'B' },
    ]);
    expect(groups.map(group => group.rows.map(row => row.value))).toEqual([[1, 3], [2], [4]]);
  });

  it('returns a single global group when fields are omitted', () => {
    const rows: Array<ExternalRow> = [{ value: 1 }, { value: 2 }];

    expect(groupRowsByFields(rows)).toEqual([{ key: '__all__', rows, values: {} }]);
  });

  it('extracts finite numeric field values only', () => {
    const rows: Array<ExternalRow> = [
      { value: 0 },
      { value: Number.NaN },
      { value: 2 },
      { value: Number.POSITIVE_INFINITY },
      { value: '3' },
    ];

    expect(finiteFieldValuesOf(rows, 'value')).toEqual([0, 2]);
  });

  it('samples inclusive linear positions with exact endpoints', () => {
    expect(linearSamplesOf([0, 8], 5)).toEqual([0, 2, 4, 6, 8]);
    expect(linearSamplesOf([2, 10], 2)).toEqual([2, 10]);
  });
});
