import { describe, expect, it } from 'vitest';
import { TransformSchema } from '../../src/ir/transform';

describe('TransformSchema (ADR-03)', () => {
  // Happy path
  it('sort_schema_valid', () => {
    const t = { kind: 'sort', field: 'month' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('sort_with_order_valid', () => {
    const t = { kind: 'sort', field: 'month', order: 'descending' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_schema_valid', () => {
    const t = { kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_custom_output_fields_valid', () => {
    const t = { kind: 'stack', x: 'm', y: 'r', groupBy: 'p', startField: 'lo', endField: 'hi' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  // 错误路径
  it('transform_unknown_kind_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'filter', field: 'm' })).toThrow();
  });

  it('sort_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'sort' })).toThrow();
  });

  it('sort_bad_order_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', field: 'm', order: 'up' })).toThrow();
  });

  it('stack_missing_y_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'stack', x: 'm', groupBy: 'p' })).toThrow();
  });
});
