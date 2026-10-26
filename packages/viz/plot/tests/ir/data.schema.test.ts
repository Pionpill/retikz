import { DataModelSchema, DataReferenceSchema, ScalarValueSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

describe('DataReferenceSchema / DataModelSchema / ScalarValueSchema（契约）', () => {
  // Happy path
  it('dataref 仅 ref 有效', () => {
    expect(DataReferenceSchema.parse({ reference: 'sales' })).toEqual({ reference: 'sales' });
  });

  it('模型有效的数据引用', () => {
    const spec = {
      reference: 'sales',
      model: [
        { name: 'month', type: 'continuous' },
        { name: 'user.age', type: 'continuous' },
        { name: 'region', type: 'categorical' },
      ],
    };

    expect(DataReferenceSchema.parse(spec)).toEqual(spec);
  });

  it('标量值每个种类有效', () => {
    expect(ScalarValueSchema.parse('a')).toBe('a');
    expect(ScalarValueSchema.parse(1)).toBe(1);
    expect(ScalarValueSchema.parse(true)).toBe(true);
    expect(ScalarValueSchema.parse(null)).toBeNull();
  });

  // 边界
  it('数据引用空引用被拒绝', () => {
    expect(() => DataReferenceSchema.parse({ reference: '' })).toThrow();
  });

  it('数据模型空数组有效', () => {
    expect(DataModelSchema.parse([])).toEqual([]);
  });

  // 错误路径
  it('数据引用丢失引用被拒绝', () => {
    expect(() => DataReferenceSchema.parse({ model: [] })).toThrow();
  });

  it('dataref 内联值被拒绝', () => {
    // 旧内联形态、无 reference —— 数据不进 IR
    expect(() => DataReferenceSchema.parse({ values: [{ x: 1 }] })).toThrow();
  });

  it('fielddef 未知类型被拒绝', () => {
    expect(() => DataReferenceSchema.parse({ reference: 'd', model: [{ name: 'g', type: 'geojson' }] })).toThrow();
  });

  it('仅 fielddef 名称有效', () => {
    // contract：type 可选，仅给 name 合法（lowering 时推断类型）
    const spec = { reference: 'd', model: [{ name: 'month', type: 'temporal' }, { name: 'revenue' }] };

    expect(DataReferenceSchema.parse(spec)).toEqual(spec);
  });

  it('仅数据模型名称字段解析', () => {
    expect(DataModelSchema.parse([{ name: 'revenue' }])).toEqual([{ name: 'revenue' }]);
  });

  it('标量值嵌套对象被拒绝', () => {
    expect(() => ScalarValueSchema.parse({ a: 1 })).toThrow();
  });
});
