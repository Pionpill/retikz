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
});
