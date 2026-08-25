import { describe, expect, it } from 'vitest';

import { DataFieldType, DataModelSchema, DataReferenceSchema, ScalarValueSchema } from '../../src';

describe('data schema', () => {
  it('parses data model and survives JSON round-trip', () => {
    const model = [
      { name: 'month', type: DataFieldType.Categorical },
      { name: 'revenue', type: DataFieldType.Continuous, format: 'number-string' },
    ];

    const parsed = DataModelSchema.parse(model);

    expect(DataModelSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('parses data reference without embedding runtime rows', () => {
    expect(DataReferenceSchema.parse({ reference: 'sales' })).toEqual({ reference: 'sales' });
    expect(() => DataReferenceSchema.parse({ values: [{ x: 1 }] })).toThrow();
  });

  it('rejects unknown keys on public data schema objects', () => {
    expect(() => DataModelSchema.parse([{ name: 'month', tyep: DataFieldType.Categorical }])).toThrow();
    expect(() => DataReferenceSchema.parse({ reference: 'sales', values: [{ x: 1 }] })).toThrow();
  });

  it('rejects duplicate model fields at the schema boundary', () => {
    const result = DataModelSchema.safeParse([{ name: 'value' }, { name: 'value' }]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: [1, 'name'], message: 'duplicate data model field "value"' }),
    ]);
  });

  it('rejects whitespace-only field and external reference names', () => {
    expect(DataModelSchema.safeParse([{ name: '   ' }]).success).toBe(false);
    expect(DataReferenceSchema.safeParse({ reference: '   ' }).success).toBe(false);
  });

  it('rejects non JSON scalar values', () => {
    expect(ScalarValueSchema.parse('A')).toBe('A');
    expect(() => ScalarValueSchema.parse(() => 1)).toThrow();
  });
});
