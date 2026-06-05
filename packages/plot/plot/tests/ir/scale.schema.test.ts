import { describe, expect, it } from 'vitest';
import { ScaleSchema } from '../../src/ir/scale';

describe('ScaleSchema (ADR-03)', () => {
  // Happy path
  it('scale_linear_omits_optionals_valid', () => {
    expect(ScaleSchema.parse({ type: 'linear', name: 'x' })).toEqual({ type: 'linear', name: 'x' });
  });

  it('scale_linear_full_fields_valid', () => {
    const s = { type: 'linear', name: 'y', domain: [0, 100], range: [0, 480], nice: true, clamp: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('scale_linear_nice_only_valid', () => {
    const s = { type: 'linear', name: 'y', nice: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界
  it('scale_domain_two_tuple_only', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', domain: [0] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', domain: [0, 1, 2] })).toThrow();
  });

  it('scale_range_two_tuple_only', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', range: [0] })).toThrow();
  });

  // 错误路径
  it('scale_empty_name_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: '' })).toThrow();
  });

  it('scale_missing_type_rejected', () => {
    expect(() => ScaleSchema.parse({ name: 'x' })).toThrow();
  });

  it('scale_unknown_type_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'log', name: 'x' })).toThrow();
  });
});

describe('ScaleSchema band / point (ADR-01)', () => {
  // Happy path
  it('band_schema_valid', () => {
    const s = { type: 'band', name: 'x', domain: ['a', 'b'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('band_full_fields_valid', () => {
    const s = { type: 'band', name: 'x', domain: ['a', 'b'], paddingInner: 0.2, paddingOuter: 0.1, align: 0 };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('point_schema_valid', () => {
    const s = { type: 'point', name: 'x', padding: 0.5 };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('band_numeric_domain_valid', () => {
    // 类别可为数值（如年份）
    const s = { type: 'band', name: 'x', domain: [2021, 2022, 2023] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界 / 错误路径
  it('band_omits_optionals_valid', () => {
    expect(ScaleSchema.parse({ type: 'band', name: 'x' })).toEqual({ type: 'band', name: 'x' });
  });

  it('band_padding_out_of_range_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', paddingInner: 1.5 })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', paddingInner: -0.1 })).toThrow();
  });

  it('band_domain_bad_element_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', domain: [true] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', domain: [{}] })).toThrow();
  });
});
