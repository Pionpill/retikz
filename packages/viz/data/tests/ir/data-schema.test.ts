import { describe, expect, it } from 'vitest';

import { DataFieldType, DataModelSchema, DataRefSchema, ScalarValueSchema } from '../../src';

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
    expect(DataRefSchema.parse({ reference: 'sales' })).toEqual({ reference: 'sales' });
    expect(() => DataRefSchema.parse({ values: [{ x: 1 }] })).toThrow();
  });

  it('rejects unknown keys on public data schema objects', () => {
    expect(() => DataModelSchema.parse([{ name: 'month', tyep: DataFieldType.Categorical }])).toThrow();
    expect(() => DataRefSchema.parse({ reference: 'sales', values: [{ x: 1 }] })).toThrow();
  });

  it('rejects non JSON scalar values', () => {
    expect(ScalarValueSchema.parse('A')).toBe('A');
    expect(() => ScalarValueSchema.parse(() => 1)).toThrow();
  });
});
