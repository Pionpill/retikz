import type { ExternalRow } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { finiteFieldValuesOf, groupRowsByFields, linearSamplesOf } from '../../src/providers/transform';

describe('transform shared helpers', () => {
  it('groups hierarchically in field order while preserving first-seen keys at each level', () => {
    const rows: Array<ExternalRow> = [
      { region: 'north', series: 'A', value: 1 },
      { region: 'south', series: 'A', value: 2 },
      { region: 'north', series: 'A', value: 3 },
      { region: 'north', series: 'B', value: 4 },
    ];

    const groups = groupRowsByFields(rows, ['region', 'series']);

    expect(groups.map(group => group.values)).toEqual([
      { region: 'north', series: 'A' },
      { region: 'north', series: 'B' },
      { region: 'south', series: 'A' },
    ]);
    expect(groups.map(group => group.rows.map(row => row.value))).toEqual([[1, 3], [4], [2]]);
    expect(groups.map(group => group.key)).toEqual(['["north","A"]', '["north","B"]', '["south","A"]']);
    expect(groupRowsByFields(rows, ['series', 'region']).map(group => group.rows.map(row => row.value))).toEqual([
      [1, 3],
      [2],
      [4],
    ]);
    expect(rows.map(row => row.value)).toEqual([1, 2, 3, 4]);
    expect(groups[0].rows[0]).toBe(rows[0]);
  });

  it('keeps nested missing and null keys together at every level without merging numeric and string keys', () => {
    const rows: Array<ExternalRow> = [
      { team: { name: 'Z' }, item: null, category: 1, value: 1 },
      { team: { name: 'A' }, item: 'x', category: 1, value: 2 },
      { team: { name: 'Z' }, item: 'x', category: 1, value: 3 },
      { team: { name: 'Z' }, category: '1', value: 4 },
      { team: { name: 'Z' }, category: 1, value: 5 },
    ];
    const groups = groupRowsByFields(rows, ['team.name', 'item', 'category']);
    expect(groups.map(group => group.rows.map(row => row.value))).toEqual([[1, 5], [4], [3], [2]]);
    expect(groups[0].values).toEqual({ 'team.name': 'Z', item: null, category: 1 });
    expect(groups[1].values).toEqual({ 'team.name': 'Z', item: undefined, category: '1' });
    expect(groupRowsByFields([], ['team.name', 'item'])).toEqual([]);
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
