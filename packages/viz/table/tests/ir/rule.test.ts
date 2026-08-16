import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRTableCellRule, IRTableCellSelector, IRTableValuePredicate } from '../../src';

import { TableCellRuleSchema, TableCellSelectorSchema, TableSchema, TableValuePredicateSchema } from '../../src';

describe('Table Cell rule schema', () => {
  it('round-trips a strict selector and ordered root rules', () => {
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

    expectTypeOf(selector).toEqualTypeOf<IRTableCellSelector>();
    expectTypeOf(rule).toEqualTypeOf<IRTableCellRule>();
    expectTypeOf(selector.value).toEqualTypeOf<IRTableValuePredicate | undefined>();
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
  ])('rejects empty, duplicate, malformed, or open selectors: %j', selector => {
    expect(() => TableCellSelectorSchema.parse(selector)).toThrow();
  });

  it('requires value predicates to target exactly value payloads when payloadKinds is present', () => {
    const value = { kind: 'equal', value: 1 } as const;

    expect(TableCellSelectorSchema.parse({ value })).toEqual({ value });
    expect(TableCellSelectorSchema.parse({ payloadKinds: ['value'], value })).toEqual({
      payloadKinds: ['value'],
      value,
    });
    expect(() => TableCellSelectorSchema.parse({ payloadKinds: ['content'], value })).toThrow(/payloadKinds/i);
    expect(() => TableCellSelectorSchema.parse({ payloadKinds: ['value', 'content'], value })).toThrow(/payloadKinds/i);
  });

  it('validates closed value predicates and their cross-field boundaries', () => {
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
  ])('rejects empty or open rule patches: %j', rule => {
    expect(() => TableCellRuleSchema.parse(rule)).toThrow();
  });

  it('keeps omitted rules absent from the authored root IR', () => {
    const spec = {
      namespace: 'table',
      type: 'table',
      structure: { kind: 'manual', rows: [[1]] },
    } as const;

    expect(TableSchema.parse(spec)).toEqual(spec);
  });
});
