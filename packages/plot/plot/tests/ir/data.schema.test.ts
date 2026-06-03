import { describe, expect, it } from 'vitest';
import { DataModelSchema, DataRefSchema, ScalarValueSchema } from '../../src/ir/data';

describe('DataRefSchema / DataModelSchema / ScalarValueSchema (ADR-02)', () => {
  // Happy path
  it('dataref_ref_only_valid', () => {
    expect(DataRefSchema.parse({ ref: 'sales' })).toEqual({ ref: 'sales' });
  });

  it('dataref_with_model_valid', () => {
    const spec = {
      ref: 'sales',
      model: [
        { name: 'month', type: 'quantitative' },
        { name: 'user.age', type: 'quantitative' },
        { name: 'region', type: 'nominal' },
      ],
    };
    expect(DataRefSchema.parse(spec)).toEqual(spec);
  });

  it('scalar_value_each_kind_valid', () => {
    expect(ScalarValueSchema.parse('a')).toBe('a');
    expect(ScalarValueSchema.parse(1)).toBe(1);
    expect(ScalarValueSchema.parse(true)).toBe(true);
    expect(ScalarValueSchema.parse(null)).toBeNull();
  });

  // 边界
  it('dataref_empty_ref_rejected', () => {
    expect(() => DataRefSchema.parse({ ref: '' })).toThrow();
  });

  it('datamodel_empty_array_valid', () => {
    expect(DataModelSchema.parse([])).toEqual([]);
  });

  // 错误路径
  it('dataref_missing_ref_rejected', () => {
    expect(() => DataRefSchema.parse({ model: [] })).toThrow();
  });

  it('dataref_inline_values_rejected', () => {
    // 旧内联形态、无 ref —— 数据不进 IR
    expect(() => DataRefSchema.parse({ values: [{ x: 1 }] })).toThrow();
  });

  it('fielddef_unknown_type_rejected', () => {
    expect(() => DataRefSchema.parse({ ref: 'd', model: [{ name: 'g', type: 'geojson' }] })).toThrow();
  });

  it('scalar_value_nested_object_rejected', () => {
    expect(() => ScalarValueSchema.parse({ a: 1 })).toThrow();
  });
});
