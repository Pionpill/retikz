import { describe, expect, it } from 'vitest';

import { TableCellRuleSchema, TableCellSelectorSchema, TableSchema, TableValuePredicateSchema } from '../../src';

describe('Table Cell 规则 schema', () => {
  it('往返严格选择器和有序根规则', () => {
    const selector = TableCellSelectorSchema.parse({
      cellIds: ['cell.a'],
      rowIndices: [0],
      roles: { any: ['data'], all: ['data'] },
      sourceKinds: ['manual'],
      payloadKinds: ['value'],
      value: { kind: 'compare', operator: 'gte', value: 0 },
      negate: false,
    });
    const rule = TableCellRuleSchema.parse({
      selector,
      formatter: { name: 'number', options: { specifier: '.1f' } },
      appearance: { background: { fill: '#ffffff' } },
    });
    const spec = TableSchema.parse({
      namespace: 'table',
      type: 'table',
      structure: { kind: 'manual', rows: [[1]] },
      rules: [rule, { selector: { payloadKinds: ['value'] }, presentation: { name: 'text' } }],
    });

    expect(spec.rules).toEqual([rule, { selector: { payloadKinds: ['value'] }, presentation: { name: 'text' } }]);
  });

  it.each([
    {},
    { negate: true },
    { cellIds: undefined },
    { cellIds: [] },
    { cellIds: ['a', 'a'] },
    { cellIds: [''] },
    { rowIndices: [-1] },
    { rowIndices: [0, 0] },
    { roles: {} },
    { roles: { any: [] } },
    { fields: ['field'], unknown: true },
  ])('拒绝空的、重复的、格式错误的或开放的选择器：%j', selector => {
    expect(() => TableCellSelectorSchema.parse(selector)).toThrow();
  });

  it('当 payloadKinds 存在时，需要值谓词来精确定位值有效负载', () => {
    const value = { kind: 'equal', value: 1 } as const;

    expect(TableCellSelectorSchema.parse({ value })).toEqual({ value });
    expect(TableCellSelectorSchema.parse({ payloadKinds: ['value'], value })).toEqual({
      payloadKinds: ['value'],
      value,
    });
    expect(() => TableCellSelectorSchema.parse({ payloadKinds: ['content'], value })).toThrow(/payloadKinds/i);
    expect(() => TableCellSelectorSchema.parse({ payloadKinds: ['value', 'content'], value })).toThrow(/payloadKinds/i);
  });

  it('验证闭值谓词及其跨字段边界', () => {
    expect(TableValuePredicateSchema.parse({ kind: 'between', min: 1, max: 1 })).toEqual({
      kind: 'between',
      min: 1,
      max: 1,
    });
    expect(TableValuePredicateSchema.parse({ kind: 'null' })).toEqual({ kind: 'null' });

    expect(() => TableValuePredicateSchema.parse({ kind: 'oneOf', values: [] })).toThrow();
    expect(() => TableValuePredicateSchema.parse({ kind: 'oneOf', values: [1, 1] })).toThrow();
    expect(() => TableValuePredicateSchema.parse({ kind: 'between', min: 2, max: 1 })).toThrow(/max/i);
    expect(() => TableValuePredicateSchema.parse({ kind: 'between', min: 1, max: '2' })).toThrow();
    expect(() => TableValuePredicateSchema.parse({ kind: 'compare', operator: 'eq', value: 1 })).toThrow();
    expect(() => TableValuePredicateSchema.parse({ kind: 'null', callback: () => true })).toThrow();
  });

  it.each([
    { selector: { cellIds: ['a'] } },
    { selector: { cellIds: ['a'] }, unknown: true, appearance: {} },
    { selector: { cellIds: ['a'] }, appearance: {}, callback: () => true },
  ])('拒绝空或开放的规则补丁：%j', rule => {
    expect(() => TableCellRuleSchema.parse(rule)).toThrow();
  });

  it('使编写的根 IR 中不存在省略的规则', () => {
    const spec = {
      namespace: 'table',
      type: 'table',
      structure: { kind: 'manual', rows: [[1]] },
    } as const;

    expect(TableSchema.parse(spec)).toEqual(spec);
  });
});
