import { describe, expect, it } from 'vitest';

import {
  DataFieldType,
  DataModelSchema,
  DataReferenceSchema,
  FieldDefinitionSchema,
  ScalarValueSchema,
} from '../../src';

describe('数据 schema', () => {
  it.each(['continuous', 'temporal'])('拒绝显式 %s 字段上的类别顺序', type => {
    for (const order of ['appearance', 'ascending', 'descending', ['S', 'M']]) {
      expect(FieldDefinitionSchema.safeParse({ name: 'value', type, order }).success).toBe(false);
    }
    expect(FieldDefinitionSchema.parse({ name: 'value', type })).toEqual({ name: 'value', type });
  });

  it('保留分类和推断声明的类别顺序', () => {
    for (const type of ['categorical', undefined]) {
      const field = { name: 'size', ...(type === undefined ? {} : { type }), order: ['S', 'M'] };
      expect(FieldDefinitionSchema.parse(JSON.parse(JSON.stringify(field)))).toEqual(field);
    }
  });

  it('解析数据模型并保持 JSON 往返等价', () => {
    const model = [
      { name: 'month', type: DataFieldType.Categorical },
      { name: 'revenue', type: DataFieldType.Continuous, format: 'number-string' },
    ];

    const parsed = DataModelSchema.parse(model);

    expect(DataModelSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('解析数据引用而不嵌入运行时行', () => {
    expect(DataReferenceSchema.parse({ reference: 'sales' })).toEqual({ reference: 'sales' });
    expect(() => DataReferenceSchema.parse({ values: [{ x: 1 }] })).toThrow();
  });

  it('拒绝公共数据 schema 对象上的未知键', () => {
    expect(() => DataModelSchema.parse([{ name: 'month', tyep: DataFieldType.Categorical }])).toThrow();
    expect(() => DataReferenceSchema.parse({ reference: 'sales', values: [{ x: 1 }] })).toThrow();
  });

  it('拒绝 schema 边界处的重复模型字段', () => {
    const result = DataModelSchema.safeParse([{ name: 'value' }, { name: 'value' }]);

    expect(result.success).toBe(false);

    if (result.success) return;

    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: [1, 'name'], message: 'duplicate data model field "value"' }),
    ]);
  });

  it('拒绝纯空白字段和​​外部引用名称', () => {
    expect(DataModelSchema.safeParse([{ name: '   ' }]).success).toBe(false);
    expect(DataReferenceSchema.safeParse({ reference: '   ' }).success).toBe(false);
  });

  it('拒绝非 JSON 标量值', () => {
    expect(ScalarValueSchema.parse('A')).toBe('A');
    expect(() => ScalarValueSchema.parse(() => 1)).toThrow();
  });
});
