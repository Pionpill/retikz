import { describe, expect, it } from 'vitest';
import { ChannelSchema, EncodingSchema } from '../../src/ir/encoding';

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

  // ADR-01：polar angle / radius 位置通道
  it('encoding_angle_radius_channels_valid', () => {
    const e = { angle: { field: 'theta' }, radius: { field: 'value' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('encoding_angle_value_constant_valid', () => {
    const e = { angle: { value: 0 }, radius: { field: 'value' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('encoding_angle_radius_channels_optional', () => {
    // 缺省 angle/radius → 仍合法（回退 x/y 是 lowering 行为，schema 层只要求可选）
    const e = { x: { field: 'theta' }, y: { field: 'value' } };
    expect(EncodingSchema.parse(e)).toEqual(e);
  });

  it('encoding_angle_field_value_mutually_exclusive_rejected', () => {
    // angle 复用 ChannelSchema → field/value 互斥仍生效
    expect(() => EncodingSchema.parse({ angle: { field: 'theta', value: 0 }, radius: { field: 'v' } })).toThrow();
  });

  it('encoding_radius_neither_field_nor_value_rejected', () => {
    expect(() => EncodingSchema.parse({ angle: { field: 'theta' }, radius: {} })).toThrow();
  });

  it('encoding_angle_radius_json_round_trip', () => {
    const e = EncodingSchema.parse({ angle: { field: 'theta' }, radius: { field: 'value' }, color: { field: 'g', scale: 'col' } });
    expect(EncodingSchema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
  });
});
