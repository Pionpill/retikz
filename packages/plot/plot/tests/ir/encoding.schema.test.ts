import { describe, expect, it } from 'vitest';
import { ChannelSchema, EncodingSchema, PointEncodingSchema, ShapeChannelSchema, SizeChannelSchema } from '../../src/schemas/encoding';

describe('ChannelSchema / EncodingSchema (ADR-05)', () => {
  // Happy path
  it('channel_field_valid', () => {
    expect(ChannelSchema.parse({ field: 'revenue' })).toEqual({ field: 'revenue' });
  });

  it('channel_value_valid', () => {
    expect(ChannelSchema.parse({ value: 0 })).toEqual({ value: 0 });
  });

  it('channel_value_null_valid', () => {
    expect(ChannelSchema.parse({ value: null })).toEqual({ value: null });
  });

  it('channel_field_path_valid', () => {
    expect(ChannelSchema.parse({ field: 'user.age' })).toEqual({ field: 'user.age' });
  });

  it('encoding_xy_valid', () => {
    const e = { x: { field: 'month' }, y: { value: 0 } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  // 错误路径：field / value 互斥
  it('channel_both_field_and_value_rejected', () => {
    expect(() => ChannelSchema.parse({ field: 'x', value: 1 })).toThrow();
  });

  it('channel_neither_field_nor_value_rejected', () => {
    expect(() => ChannelSchema.parse({})).toThrow();
  });

  // 交互：value 复用 ScalarValue 标量约束
  it('channel_value_uses_scalar', () => {
    expect(() => ChannelSchema.parse({ value: { a: 1 } })).toThrow();
  });

  // ADR-04：color 通道 + scale 引用
  it('channel_with_scale_ref_valid', () => {
    const c = { field: 'continent', scale: 'col' };
    expect(ChannelSchema.parse(c)).toEqual(c);
  });

  it('encoding_color_channel_valid', () => {
    const e = { x: { field: 'gdp' }, y: { field: 'life' }, color: { field: 'continent', scale: 'col' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('encoding_color_constant_valid', () => {
    const e = { x: { field: 'gdp' }, y: { field: 'life' }, color: { value: '#e4572e' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('color_channel_both_field_value_rejected', () => {
    expect(() => ChannelSchema.parse({ field: 'c', value: '#000', scale: 'col' })).toThrow();
  });

  // ADR-01（alpha.9）：x / y 从必填转可选——必填性下放到 coordinate 级校验（cartesian2D 需 x+y、
  // cartesian1D 仅需单维、ternary2D 需 x/y/z）。schema 层放宽，缺角色由 lowering fail-loud（见 coordinate-frame.test.ts）。
  it('encoding_missing_x_accepted', () => {
    expect(EncodingSchema.parse({ y: { field: 'value' } })).toEqual({ y: { field: 'value' } });
  });

  it('encoding_missing_y_accepted', () => {
    expect(EncodingSchema.parse({ x: { field: 'theta' } })).toEqual({ x: { field: 'theta' } });
  });

  it('encoding_empty_accepted', () => {
    // 位置 encoding 全可选；空 encoding 在 schema 层合法，必填性是 coordinate 级语义
    expect(EncodingSchema.parse({})).toEqual({});
  });

  it('encoding_json_round_trip', () => {
    const e = EncodingSchema.parse({ x: { field: 'theta' }, y: { field: 'value' }, color: { field: 'g', scale: 'col' } });
    expect(EncodingSchema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
  });

  // alpha.9 ADR-03：ternary 的 x/y/z 位置角色通道（可选；ternary 必填由 lowering 校验）
  it('encoding_xyz_channels_valid', () => {
    const e = { x: { field: 'sand' }, y: { field: 'silt' }, z: { field: 'clay' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('encoding_xyz_with_color_valid', () => {
    const e = { x: { field: 'sand' }, y: { field: 'silt' }, z: { field: 'clay' }, color: { field: 'region', scale: 'col' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('encoding_xyz_json_round_trip', () => {
    const e = EncodingSchema.parse({ x: { field: 'sand' }, y: { field: 'silt' }, z: { field: 'clay' } });
    expect(EncodingSchema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
  });

  it('custom_role_channels_preserved_for_coordinate_definition', () => {
    const e = { u: { field: 'longitude' }, v: { field: 'latitude' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });
});

describe('SizeChannelSchema / PointEncodingSchema (alpha.7 ADR-02)', () => {
  // Happy path
  it('size_field_valid', () => {
    expect(SizeChannelSchema.parse({ field: 'population' })).toEqual({ field: 'population' });
  });

  it('size_value_constant_radius_valid', () => {
    expect(SizeChannelSchema.parse({ value: 8 })).toEqual({ value: 8 });
  });

  it('size_field_with_scale_valid', () => {
    expect(SizeChannelSchema.parse({ field: 'p', scale: '__size_p' })).toEqual({ field: 'p', scale: '__size_p' });
  });

  it('point_encoding_with_size_valid', () => {
    const e = { x: { field: 'lng' }, y: { field: 'lat' } };
    expect(PointEncodingSchema.parse(e)).toEqual(e);
  });

  // 错误路径
  it('size_field_and_value_mutually_exclusive', () => {
    expect(() => SizeChannelSchema.parse({ field: 'p', value: 5 })).toThrow();
    expect(() => SizeChannelSchema.parse({})).toThrow();
  });

  it('size_value_negative_rejected', () => {
    expect(() => SizeChannelSchema.parse({ value: -3 })).toThrow();
  });

  it('size_value_non_number_rejected', () => {
    expect(() => SizeChannelSchema.parse({ value: 'big' })).toThrow();
  });

  // 未知 encoding key 在 schema 层保留，是否是合法位置角色由 active CoordinateDefinition.roles 在 lowering 校验。
  it('shared_encoding_preserves_unknown_role_key', () => {
    const e = EncodingSchema.parse({ x: { field: 'x' }, y: { field: 'y' }, size: { field: 'p' } });
    expect((e as { size?: unknown }).size).toEqual({ field: 'p' });
  });
});

describe('ShapeChannelSchema (alpha.7 ADR-05)', () => {
  // Happy path
  it('shape_field_valid', () => {
    expect(ShapeChannelSchema.parse({ field: 'category' })).toEqual({ field: 'category' });
  });

  it('shape_value_valid', () => {
    expect(ShapeChannelSchema.parse({ value: 'diamond' })).toEqual({ value: 'diamond' });
  });

  it('point_encoding_with_shape_valid', () => {
    const e = { x: { field: 'x' }, y: { field: 'y' } };
    expect(PointEncodingSchema.parse(e)).toEqual(e);
  });

  // 错误路径
  it('shape_field_and_value_mutually_exclusive', () => {
    expect(() => ShapeChannelSchema.parse({ field: 'c', value: 'circle' })).toThrow();
    expect(() => ShapeChannelSchema.parse({})).toThrow();
  });

  it('shape_has_no_scale_field', () => {
    // 本轮 shape 不开放显式 scale 引用：多余的 scale key 被剥离（非 strict）
    const parsed = ShapeChannelSchema.parse({ field: 'c', scale: 'whatever' });
    expect((parsed as { scale?: unknown }).scale).toBeUndefined();
  });

  it('shared_encoding_preserves_unknown_role_key_shape', () => {
    const e = EncodingSchema.parse({ x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'c' } });
    expect((e as { shape?: unknown }).shape).toEqual({ field: 'c' });
  });
});
