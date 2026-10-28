import { describe, expect, it } from 'vitest';

import { PointMarkEncodingSchema, PointMarkSchema, PathMarkSchema, IntervalMarkSchema } from '../../src/schemas';
import { ChannelSchema, PositionEncodingSchema, PositionInputSchema } from '../../src/schemas/encoding';

describe('字段编码契约', () => {
  it('保留嵌套字段路径和显式比例引用', () => {
    expect(ChannelSchema.parse('user.age')).toBe('user.age');
    const binding = { field: 'continent', scale: 'col' };
    expect(ChannelSchema.parse(binding)).toEqual(binding);
  });

  it.each([
    { value: 0 },
    { value: null },
    { value: { nested: [true, null] } },
    { field: 'x' },
    { field: 'x', value: 1 },
    {},
    { field: 'x', scale: 's', extra: true },
  ])('拒绝常量和不完整或未声明的绑定成员：%j', input => {
    expect(ChannelSchema.safeParse(input).success).toBe(false);
  });

  it('通过 JSON 将封闭坐标角色与视觉目标分开分组', () => {
    const input = {
      position: { x: { field: 'longitude' }, y: { field: 'latitude' } },
      color: { field: 'continent', scale: 'col' },
    };
    expect(PointMarkEncodingSchema.parse(input)).toEqual(input);
    expect(PointMarkEncodingSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
  });

  it.each([
    { x: { field: 'theta' } },
    { x: { value: 1 }, y: { edge: 'end' } },
    { x: { value: 1 }, y: { field: 'height' }, z: { edge: 'end' } },
  ])('接受一维、二维或三维的连续位置角色：%j', position => {
    expect(PositionEncodingSchema.parse(position)).toEqual(position);
  });
  it.each([{}, { y: { value: 1 } }, { x: { value: 1 }, z: { edge: 'end' } }, { x: { value: 1 }, u: { value: 2 } }])(
    '拒绝跳过或未知的位置角色：%j',
    position => {
      expect(PositionEncodingSchema.safeParse(position).success).toBe(false);
    },
  );
  it.each([{ field: 'a.b' }, { value: 12 }, { value: 'May' }, { edge: 'start' }, { edge: 'end' }])(
    '往返位置源：%j',
    input => {
      expect(PositionInputSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
    },
  );
  it.each([
    'x',
    1,
    {},
    { field: 'x', value: 1 },
    { value: 1, edge: 'start' },
    { edge: 'middle' },
    { value: Infinity },
    { value: null },
    { field: 'x', scale: 's' },
  ])('拒绝无效或混合位置源：%j', input => {
    expect(PositionInputSchema.safeParse(input).success).toBe(false);
  });

  it('拒绝空白角色键和嵌套角色绑定对象', () => {
    expect(PositionEncodingSchema.safeParse({ ' ': 'longitude' }).success).toBe(false);
    expect(PositionEncodingSchema.safeParse({ x: { field: 'longitude', extra: true } }).success).toBe(false);
    expect(PointMarkEncodingSchema.safeParse({ position: { ' ': 'longitude' } }).success).toBe(false);
  });

  it('支持大小和形状作为字段目标并保留注册的扩展候选', () => {
    const input = {
      position: { x: { field: 'x' }, y: { field: 'y' } },
      size: 'population',
      shape: 'category',
      custom: 'value',
    };
    expect(PointMarkEncodingSchema.parse(input)).toEqual(input);
    expect(
      PointMarkEncodingSchema.parse({ position: { x: { value: 1 } }, size: { field: 'p', scale: 'sizes' } }),
    ).toEqual({
      position: { x: { value: 1 } },
      size: { field: 'p', scale: 'sizes' },
    });
  });

  it('验证属性中的固定大小和形状，而不是字段编码', () => {
    expect(
      PointMarkSchema.parse({
        type: 'point',
        encodings: { position: { x: { value: 1 } } },
        properties: { size: 8, shape: 'diamond' },
      }).properties,
    ).toMatchObject({ size: 8, shape: 'diamond' });
    for (const size of [-3, 'big']) {
      expect(
        PointMarkSchema.safeParse({ type: 'point', encodings: { position: { x: { value: 1 } } }, properties: { size } })
          .success,
      ).toBe(false);
    }
    expect(PointMarkEncodingSchema.safeParse({ shape: { value: 'diamond' } }).success).toBe(false);
  });
});

describe('标记位置几何输入', () => {
  const start = { x: { edge: 'start' }, y: { value: 10 } };
  const end = { x: { edge: 'end' }, y: { value: 10 } };

  it('接受完整端点并保留默认域贡献', () => {
    const mark = { type: 'path', encodings: { from: start, to: end } };
    expect(PathMarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toMatchObject({ ...mark, contributeToDomain: true });
  });

  it.each([
    { position: start, from: start, to: end },
    { from: start },
    { from: start, to: end, series: 'group' },
    { from: start, to: end, order: 'order' },
  ])('拒绝混合或不完整的路径几何形状：%j', encodings => {
    expect(PathMarkSchema.safeParse({ type: 'path', encodings }).success).toBe(false);
  });

  it('接受 x/y 上独立来源的范围端点', () => {
    const mark = {
      type: 'interval',
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
      encodings: {
        bounds: {
          x: { from: { edge: 'start' }, to: { edge: 'end' } },
          y: { from: { field: 'low' }, to: { value: 20 } },
        },
      },
    };
    expect(IntervalMarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toMatchObject(mark);
  });

  it('拒绝所有位置结构中的 z 和任意区间角色', () => {
    for (const mark of [
      { type: 'interval', encodings: { position: { x: { value: 1 }, z: { value: 2 } } } },
      { type: 'interval', encodings: { bounds: { z: { from: { value: 1 }, to: { value: 2 } } } } },
      { type: 'interval', properties: { bounds: { z: { kind: 'full' } } } },
    ])
      expect(IntervalMarkSchema.safeParse(mark).success).toBe(false);
  });

  it('拒绝过时的种类和属性位置而不是转换它们', () => {
    expect(PointMarkSchema.safeParse({ type: 'point', kind: 'data', encodings: { position: start } }).success).toBe(
      false,
    );
    expect(
      PointMarkSchema.safeParse({ type: 'point', encodings: { position: start }, properties: { position: { x: 1 } } })
        .success,
    ).toBe(false);
  });
});

it('往返简写标签并拒绝跨宿主或无效字体绑定', () => {
  const point = {
    type: 'point',
    encodings: { label: ['name', { font: { family: 'family', size: 'size' } }] },
    properties: { label: ['fixed', { text: 'other' }] },
  };
  expect(PointMarkSchema.parse(JSON.parse(JSON.stringify(point)))).toMatchObject(point);
  expect(PointMarkSchema.safeParse({ type: 'point', encodings: { label: { sloped: 's' } } }).success).toBe(false);
  expect(PathMarkSchema.safeParse({ type: 'path', encodings: { label: { rotate: 'r' } } }).success).toBe(false);
  expect(
    PointMarkSchema.safeParse({ type: 'point', encodings: { label: { font: { family: { field: 'f', scale: 's' } } } } })
      .success,
  ).toBe(false);
});
