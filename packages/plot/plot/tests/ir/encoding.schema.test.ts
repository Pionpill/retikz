import { describe, expect, it } from 'vitest';
import { ChannelSchema, EncodingSchema, OpacityChannelSchema, PointEncodingSchema, ShapeChannelSchema, SizeChannelSchema } from '../../src/ir/encoding';

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

  // x / y 必填（无 angle/radius：x/y 是唯一位置通道，坐标系重解释——polar 下 x→angle、y→radius）
  it('encoding_missing_x_rejected', () => {
    expect(() => EncodingSchema.parse({ y: { field: 'value' } })).toThrow();
  });

  it('encoding_missing_y_rejected', () => {
    expect(() => EncodingSchema.parse({ x: { field: 'theta' } })).toThrow();
  });

  it('encoding_empty_rejected', () => {
    expect(() => EncodingSchema.parse({})).toThrow();
  });

  it('encoding_json_round_trip', () => {
    const e = EncodingSchema.parse({ x: { field: 'theta' }, y: { field: 'value' }, color: { field: 'g', scale: 'col' } });
    expect(EncodingSchema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
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
    const e = { x: { field: 'lng' }, y: { field: 'lat' }, size: { field: 'pop' } };
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

  // size 不进共享 EncodingSchema：非 point mark 的 encoding 会剥离 size（非 strict，类型层由 TS 守）
  it('shared_encoding_strips_size', () => {
    const e = EncodingSchema.parse({ x: { field: 'x' }, y: { field: 'y' }, size: { field: 'p' } });
    expect((e as { size?: unknown }).size).toBeUndefined();
  });
});

describe('OpacityChannelSchema (alpha.7 ADR-04)', () => {
  // Happy path
  it('opacity_field_valid', () => {
    expect(OpacityChannelSchema.parse({ field: 'density' })).toEqual({ field: 'density' });
  });

  it('opacity_value_valid', () => {
    expect(OpacityChannelSchema.parse({ value: 0.5 })).toEqual({ value: 0.5 });
    expect(OpacityChannelSchema.parse({ value: 0 })).toEqual({ value: 0 });
    expect(OpacityChannelSchema.parse({ value: 1 })).toEqual({ value: 1 });
  });

  it('point_encoding_with_opacity_valid', () => {
    const e = { x: { field: 'x' }, y: { field: 'y' }, opacity: { field: 'd' } };
    expect(PointEncodingSchema.parse(e)).toEqual(e);
  });

  // 错误路径
  it('opacity_value_out_of_range_rejected', () => {
    expect(() => OpacityChannelSchema.parse({ value: 1.5 })).toThrow();
    expect(() => OpacityChannelSchema.parse({ value: -0.1 })).toThrow();
  });

  it('opacity_field_and_value_mutually_exclusive', () => {
    expect(() => OpacityChannelSchema.parse({ field: 'd', value: 0.5 })).toThrow();
    expect(() => OpacityChannelSchema.parse({})).toThrow();
  });

  it('shared_encoding_strips_opacity', () => {
    const e = EncodingSchema.parse({ x: { field: 'x' }, y: { field: 'y' }, opacity: { field: 'd' } });
    expect((e as { opacity?: unknown }).opacity).toBeUndefined();
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
    const e = { x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'cat' } };
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

  it('shared_encoding_strips_shape', () => {
    const e = EncodingSchema.parse({ x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'c' } });
    expect((e as { shape?: unknown }).shape).toBeUndefined();
  });
});
