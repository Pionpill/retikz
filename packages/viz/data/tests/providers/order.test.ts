import { describe, expect, it } from 'vitest';

import {
  defineFieldOrder,
  FieldDefinitionSchema,
  resolveCategoryDomain,
  resolveFieldOrderRegistry,
  RetikzDataError,
} from '../../src';

describe('类别顺序', () => {
  it('具名排序保持往返等价并保留非分类限制', () => {
    const field = { name: 'version', type: 'categorical', order: 'business' };
    expect(FieldDefinitionSchema.parse(JSON.parse(JSON.stringify(field)))).toEqual(field);
    expect(FieldDefinitionSchema.safeParse({ ...field, type: 'continuous' }).success).toBe(false);
    expect(FieldDefinitionSchema.safeParse({ ...field, order: '  ' }).success).toBe(false);
  });

  it('比较版本段，没有小数或整数精度损失', () => {
    expect(resolveCategoryDomain(['10.18', '10.2', '10.2.0'], 'naturalAscending')).toEqual(['10.2', '10.2.0', '10.18']);
    expect(resolveCategoryDomain(['v9007199254740993', 'v9007199254740992'], 'naturalAscending')).toEqual([
      'v9007199254740992',
      'v9007199254740993',
    ]);
  });

  it('在两个方向上保持等效自然键稳定并保留身份', () => {
    const values = ['v02', 'v2', 'v10'];
    expect(resolveCategoryDomain(values, 'naturalAscending')).toEqual(values);
    expect(resolveCategoryDomain(values, 'naturalDescending')).toEqual(['v10', 'v02', 'v2']);
    expect(resolveCategoryDomain([2, '2', 2, null, Infinity], 'naturalAscending')).toEqual([2, '2']);
    expect(values).toEqual(['v02', 'v2', 'v10']);
  });

  it('保留现有的数字、字符串、反向关系和显式域行为', () => {
    expect(resolveCategoryDomain([10, 2, 1], 'ascending')).toEqual([1, 2, 10]);
    expect(resolveCategoryDomain(['10.2', '10.18'], 'ascending')).toEqual(['10.18', '10.2']);
    expect(resolveCategoryDomain([2, '2'], 'descending')).toEqual(['2', 2]);
    expect(resolveCategoryDomain(['B', 'A', 'B'], undefined)).toEqual(['B', 'A']);
    expect(resolveCategoryDomain(['B', 'A'], ['C', 'A'])).toEqual(['C', 'A', 'B']);
    expect(resolveCategoryDomain([], ['C'])).toEqual(['C']);
  });

  it('使用请求本地定义并诊断未知名称，即使对于空输入也是如此', () => {
    const definition = defineFieldOrder({ name: 'length', compare: (a, b) => String(a).length - String(b).length });
    const registry = resolveFieldOrderRegistry([definition]);
    expect(resolveCategoryDomain(['bbb', 'a', 'cc'], 'length', registry)).toEqual(['a', 'cc', 'bbb']);
    expect(() => resolveCategoryDomain([], 'length')).toThrow(RetikzDataError);
    expect(() => resolveFieldOrderRegistry([definition, definition])).toThrow(/duplicate/);
    expect(() => resolveFieldOrderRegistry([{ ...definition, name: 'ascending' }])).toThrow(/duplicate/);
    expect(() => resolveFieldOrderRegistry([{ ...definition, name: ' ' }])).toThrow(/name/);
  });

  it('包装回调失败并拒绝非有限比较结果', () => {
    const cause = new Error('comparison failed');
    const registry = resolveFieldOrderRegistry([
      defineFieldOrder({
        name: 'throws',
        compare: () => {
          throw cause;
        },
      }),
      defineFieldOrder({ name: 'invalid', compare: () => NaN }),
    ]);
    expect(() => resolveCategoryDomain(['a', 'b'], 'throws', registry)).toThrow(expect.objectContaining({ cause }));
    expect(() => resolveCategoryDomain(['a', 'b'], 'invalid', registry)).toThrow(/finite/);
  });
});

it('使用固定文本、运行类型和前缀排序', () => {
  expect(resolveCategoryDomain(['v2a', 'v2', 'v10', 'A2', 'a2', '-2', '2a', ''], 'naturalAscending')).toEqual([
    '',
    '2a',
    '-2',
    'A2',
    'a2',
    'v2',
    'v2a',
    'v10',
  ]);
});
