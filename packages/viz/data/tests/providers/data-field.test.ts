import { describe, expect, it } from 'vitest';

import type { ExternalRow } from '../../src';

import {
  coerceValue,
  DataFieldFormat,
  DataFieldType,
  normalizeRows,
  resolveFieldPath,
  resolveFieldTypes,
  resolveFormatRegistry,
} from '../../src';

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
        ['age', DataFieldType.Continuous],
        ['group', DataFieldType.Categorical],
      ]),
      { age: 'user.age' },
    );

    expect(normalized[0]).toMatchObject({ age: 42, group: 'true' });
  });

  it('uses declared model fields for strict type resolution', () => {
    expect(() =>
      resolveFieldTypes([{ name: 'x', type: DataFieldType.Continuous }], [{ y: 1 }], new Set(['y'])),
    ).toThrow(/unknown field "y"/);
  });

  it('returns undefined for missing categorical values', () => {
    expect(coerceValue(undefined, DataFieldType.Categorical)).toBeUndefined();
  });

  it('parses slashDate only when the value is a real YYYY/MM/DD calendar date', () => {
    const slashDate = resolveFormatRegistry().get(DataFieldFormat.SlashDate);
    const earlyDate = new Date(0);
    earlyDate.setUTCFullYear(1, 0, 1);
    earlyDate.setUTCHours(0, 0, 0, 0);

    expect(slashDate?.parse('0001/01/01')).toBe(earlyDate.getTime());
    expect(slashDate?.parse('2024/02/29')).toBe(Date.UTC(2024, 1, 29));
    expect(Number.isNaN(slashDate?.parse('2023/02/29'))).toBe(true);
    expect(Number.isNaN(slashDate?.parse('2024/13/01'))).toBe(true);
    expect(Number.isNaN(slashDate?.parse('2024/01/32'))).toBe(true);
    expect(Number.isNaN(slashDate?.parse('2024/00/00'))).toBe(true);
  });
});
