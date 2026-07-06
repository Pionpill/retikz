import { describe, expect, it } from 'vitest';

import type { ExternalRow } from '../../src';

import { coerceValue, normalizeRows, PlotFieldType, resolveFieldPath, resolveFieldTypes } from '../../src';

describe('data field runtime', () => {
  it('resolves exact dotted keys before nested paths', () => {
    const row: ExternalRow = { 'user.age': 42, user: { age: 12 } };

    expect(resolveFieldPath(row, 'user.age')).toBe(42);
    expect(resolveFieldPath({ user: { age: 12 } }, 'user.age')).toBe(12);
  });

  it('maps logical fields to physical paths while normalizing rows', () => {
    const rows: Array<ExternalRow> = [{ user: { age: '42' }, group: true }];
    const normalized = normalizeRows(
      rows,
      new Map([
        ['age', PlotFieldType.Continuous],
        ['group', PlotFieldType.Categorical],
      ]),
      { age: 'user.age' },
    );

    expect(normalized[0]).toMatchObject({ age: 42, group: 'true' });
  });

  it('uses declared model fields for strict type resolution', () => {
    expect(() =>
      resolveFieldTypes([{ name: 'x', type: PlotFieldType.Continuous }], [{ y: 1 }], new Set(['y'])),
    ).toThrow(/unknown field "y"/);
  });

  it('returns undefined for missing categorical values', () => {
    expect(coerceValue(undefined, PlotFieldType.Categorical)).toBeUndefined();
  });
});
