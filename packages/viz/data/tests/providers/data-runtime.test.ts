import { describe, expect, it } from 'vitest';

import type { DataFieldTypeMap, ExternalRow } from '../../src';

import {
  applyFieldResolver,
  assertAllValuesValid,
  coerceCategory,
  coerceNumber,
  coerceTimestamp,
  coerceValue,
  DataFieldType,
  inferCategoryDomain,
  inferFieldType,
  normalizeRows,
  resolveFieldTypes,
  validateBoundData,
} from '../../src';

describe('data provider runtime boundaries', () => {
  it('coerces only finite decimal values into continuous numbers', () => {
    expect(coerceNumber(1.5)).toBe(1.5);
    expect(coerceNumber(42n)).toBe(42);
    expect(coerceNumber(' 1.2e2 ')).toBe(120);
    expect(coerceNumber('.5')).toBe(0.5);

    for (const value of [Number.POSITIVE_INFINITY, 9007199254740993n, '', '0x10', '12px', null]) {
      expect(Number.isNaN(coerceNumber(value))).toBe(true);
    }
  });

  it('keeps categorical values JSON-safe and rejects non-finite numbers', () => {
    expect(coerceCategory('alpha')).toBe('alpha');
    expect(coerceCategory(2)).toBe(2);
    expect(coerceCategory(true)).toBe('true');
    expect(coerceCategory(Number.NaN)).toBeUndefined();
    expect(coerceCategory({ label: 'alpha' })).toBeUndefined();
    expect(coerceValue(undefined, DataFieldType.Categorical)).toBeUndefined();
  });

  it('coerces valid temporal values and rejects impossible calendar dates', () => {
    const stamp = Date.UTC(2024, 1, 29);

    expect(coerceTimestamp(new Date(stamp))).toBe(stamp);
    expect(coerceTimestamp(stamp)).toBe(stamp);
    expect(coerceTimestamp('2024-02-29')).toBe(stamp);
    expect(coerceTimestamp(new Date(Number.NaN))).toBeNull();
    expect(coerceTimestamp('2023-02-29')).toBeNull();
    expect(Number.isNaN(coerceValue('2023-02-29', DataFieldType.Temporal))).toBe(true);
  });

  it('infers measurement types from non-missing samples and preserves category order', () => {
    expect(inferFieldType([{ x: null }, { x: 1 }, { x: 2 }], 'x')).toBe(DataFieldType.Continuous);
    expect(inferFieldType([{ x: '2024-01-01' }, { x: '2024-02-01' }], 'x')).toBe(DataFieldType.Temporal);
    expect(inferFieldType([{ x: 1 }, { x: 'one' }], 'x')).toBe(DataFieldType.Categorical);
    expect(inferFieldType([{ x: null }, { x: Number.NaN }], 'x')).toBe(DataFieldType.Categorical);
    expect(inferCategoryDomain(['beta', 2, 'alpha', 'beta', null])).toEqual(['beta', 2, 'alpha']);
    expect(inferCategoryDomain([Number.NaN, Infinity, -Infinity, 1, 'alpha'])).toEqual([1, 'alpha']);
  });

  it('rejects duplicate or unknown model fields before runtime normalization', () => {
    expect(() =>
      resolveFieldTypes(
        [
          { name: 'value', type: DataFieldType.Continuous },
          { name: 'value', type: DataFieldType.Categorical },
        ],
        [{ value: 1 }],
        new Set(['value']),
      ),
    ).toThrow('data: duplicate field "value" in data.model');
    expect(() => resolveFieldTypes([{ name: 'value' }], [{ other: 1 }], new Set(['other']))).toThrow(
      'data: unknown field "other"',
    );
  });

  it('applies resolver type and parser overrides with physical-path context', () => {
    const baseTypes: DataFieldTypeMap = new Map([
      ['amount', DataFieldType.Categorical],
      ['group', DataFieldType.Categorical],
    ]);
    const seen: Array<{ field: string; physicalPath: string; declaredType: string | undefined }> = [];
    const result = applyFieldResolver(
      baseTypes,
      new Set(['amount', 'group']),
      [{ name: 'amount' }, { name: 'group', type: DataFieldType.Categorical }],
      'sales',
      { amount: 'raw.amount' },
      (field, context) => {
        seen.push({ field, physicalPath: context.physicalPath, declaredType: context.declaredType });
        return field === 'amount'
          ? { type: DataFieldType.Continuous, parse: raw => Number(String(raw).replace('$', '')) }
          : undefined;
      },
    );

    expect(seen).toEqual([
      { field: 'amount', physicalPath: 'raw.amount', declaredType: undefined },
      { field: 'group', physicalPath: 'group', declaredType: DataFieldType.Categorical },
    ]);
    expect(result.fieldTypes.get('amount')).toBe(DataFieldType.Continuous);
    expect(result.parsers.get('amount')?.('$12')).toBe(12);
    expect(result.resolverHit).toBe(true);
    expect(baseTypes.get('amount')).toBe(DataFieldType.Categorical);
  });

  it('requires a measurement type when a resolver adds an untyped parser', () => {
    expect(() =>
      applyFieldResolver(
        new Map([['value', DataFieldType.Categorical]]),
        new Set(['value']),
        undefined,
        'source',
        undefined,
        () => ({ parse: raw => String(raw) }),
      ),
    ).toThrow('data: resolveField parse for "value" needs a type');
  });

  it('normalizes logical fields without mutating source rows', () => {
    const source: Array<ExternalRow> = [{ raw: { amount: '$12' }, group: true }];
    const normalized = normalizeRows(
      source,
      new Map([
        ['amount', DataFieldType.Continuous],
        ['group', DataFieldType.Categorical],
      ]),
      { amount: 'raw.amount' },
      new Map([['amount', raw => Number(String(raw).replace('$', ''))]]),
    );

    expect(normalized).toEqual([{ raw: { amount: '$12' }, amount: 12, group: 'true' }]);
    expect(source).toEqual([{ raw: { amount: '$12' }, group: true }]);
  });

  it('diagnoses sampled invalid and missing values separately', () => {
    const types: DataFieldTypeMap = new Map([['value', DataFieldType.Continuous]]);
    const rows: Array<ExternalRow> = [{ value: null }, { value: 'bad' }, { value: 3 }];

    expect(() => validateBoundData(rows, types, 2)).toThrow(
      'data: field "value" has no valid values in the sampled data: 1/2 invalid, 1/2 missing',
    );
    expect(() => validateBoundData(rows, types, 3)).not.toThrow();
  });

  it('reports the first invalid normalized row in strict mode', () => {
    const types: DataFieldTypeMap = new Map([['value', DataFieldType.Continuous]]);

    expect(() => assertAllValuesValid([{ value: 1 }, { value: Number.NaN }], types)).toThrow(
      'data: field "value" has missing or invalid at row 1',
    );
  });
});
