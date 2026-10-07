import { describe, expect, it } from 'vitest';

import {
  defineFieldOrder,
  FieldDefinitionSchema,
  resolveCategoryDomain,
  resolveFieldOrderRegistry,
  RetikzDataError,
} from '../../src';

describe('category order', () => {
  it('round-trips named orders and keeps noncategorical restrictions', () => {
    const field = { name: 'version', type: 'categorical', order: 'business' };
    expect(FieldDefinitionSchema.parse(JSON.parse(JSON.stringify(field)))).toEqual(field);
    expect(FieldDefinitionSchema.safeParse({ ...field, type: 'continuous' }).success).toBe(false);
    expect(FieldDefinitionSchema.safeParse({ ...field, order: '  ' }).success).toBe(false);
  });

  it('compares version segments without decimal or integer precision loss', () => {
    expect(resolveCategoryDomain(['10.18', '10.2', '10.2.0'], 'naturalAscending')).toEqual(['10.2', '10.2.0', '10.18']);
    expect(resolveCategoryDomain(['v9007199254740993', 'v9007199254740992'], 'naturalAscending')).toEqual([
      'v9007199254740992',
      'v9007199254740993',
    ]);
  });

  it('keeps equivalent natural keys stable in both directions and preserves identities', () => {
    const values = ['v02', 'v2', 'v10'];
    expect(resolveCategoryDomain(values, 'naturalAscending')).toEqual(values);
    expect(resolveCategoryDomain(values, 'naturalDescending')).toEqual(['v10', 'v02', 'v2']);
    expect(resolveCategoryDomain([2, '2', 2, null, Infinity], 'naturalAscending')).toEqual([2, '2']);
    expect(values).toEqual(['v02', 'v2', 'v10']);
  });

  it('keeps existing numeric, string, reverse-tie and explicit domain behavior', () => {
    expect(resolveCategoryDomain([10, 2, 1], 'ascending')).toEqual([1, 2, 10]);
    expect(resolveCategoryDomain(['10.2', '10.18'], 'ascending')).toEqual(['10.18', '10.2']);
    expect(resolveCategoryDomain([2, '2'], 'descending')).toEqual(['2', 2]);
    expect(resolveCategoryDomain(['B', 'A', 'B'], undefined)).toEqual(['B', 'A']);
    expect(resolveCategoryDomain(['B', 'A'], ['C', 'A'])).toEqual(['C', 'A', 'B']);
    expect(resolveCategoryDomain([], ['C'])).toEqual(['C']);
  });

  it('uses request-local definitions and diagnoses unknown names even for empty input', () => {
    const definition = defineFieldOrder({ name: 'length', compare: (a, b) => String(a).length - String(b).length });
    const registry = resolveFieldOrderRegistry([definition]);
    expect(resolveCategoryDomain(['bbb', 'a', 'cc'], 'length', registry)).toEqual(['a', 'cc', 'bbb']);
    expect(() => resolveCategoryDomain([], 'length')).toThrow(RetikzDataError);
    expect(() => resolveFieldOrderRegistry([definition, definition])).toThrow(/duplicate/);
    expect(() => resolveFieldOrderRegistry([{ ...definition, name: 'ascending' }])).toThrow(/duplicate/);
    expect(() => resolveFieldOrderRegistry([{ ...definition, name: ' ' }])).toThrow(/name/);
  });

  it('wraps callback failures and rejects nonfinite comparison results', () => {
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

it('uses fixed text, run-kind and prefix ordering', () => {
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
