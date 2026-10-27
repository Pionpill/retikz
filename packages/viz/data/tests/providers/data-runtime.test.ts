import { describe, expect, it } from 'vitest';

import type { DataFieldTypeMap, ExternalRow } from '../../src';
import {
  applyFieldResolver,
  assertAllValuesValid,
  coerceTimestamp,
  coerceValue,
  DataFieldType,
  inferCategoryDomain,
  inferFieldType,
  normalizeRows,
  resolveFieldTypes,
  validateBoundData,
} from '../../src';

describe('数据提供者运行时边界', () => {
  it('仅将有限的十进制值强制转换为连续数字', () => {
    expect(coerceValue(1.5, DataFieldType.Continuous)).toBe(1.5);
    expect(coerceValue(42n, DataFieldType.Continuous)).toBe(42);
    expect(coerceValue(' 1.2e2 ', DataFieldType.Continuous)).toBe(120);
    expect(coerceValue('.5', DataFieldType.Continuous)).toBe(0.5);

    for (const value of [Number.POSITIVE_INFINITY, 9007199254740993n, '', '0x10', '12px', null]) {
      expect(Number.isNaN(coerceValue(value, DataFieldType.Continuous))).toBe(true);
    }
  });

  it('保持分类值 JSON 安全并拒绝非有限数字', () => {
    expect(coerceValue('alpha', DataFieldType.Categorical)).toBe('alpha');
    expect(coerceValue(2, DataFieldType.Categorical)).toBe(2);
    expect(coerceValue(true, DataFieldType.Categorical)).toBe('true');
    expect(coerceValue(Number.NaN, DataFieldType.Categorical)).toBeUndefined();
    expect(coerceValue({ label: 'alpha' }, DataFieldType.Categorical)).toBeUndefined();
    expect(coerceValue(undefined, DataFieldType.Categorical)).toBeUndefined();
  });

  it('强制有效的时间值并拒绝不可能的日历日期', () => {
    const stamp = Date.UTC(2024, 1, 29);

    expect(coerceTimestamp(new Date(stamp))).toBe(stamp);
    expect(coerceTimestamp(stamp)).toBe(stamp);
    expect(coerceTimestamp('2024-02-29')).toBe(stamp);
    expect(coerceTimestamp(new Date(Number.NaN))).toBeNull();
    expect(coerceTimestamp('2023-02-29')).toBeNull();
    expect(Number.isNaN(coerceValue('2023-02-29', DataFieldType.Temporal))).toBe(true);
  });

  it('从非缺失样本推断测量类型并保留类别顺序', () => {
    expect(inferFieldType([{ x: null }, { x: 1 }, { x: 2 }], 'x')).toBe(DataFieldType.Continuous);
    expect(inferFieldType([{ x: '2024-01-01' }, { x: '2024-02-01' }], 'x')).toBe(DataFieldType.Temporal);
    expect(inferFieldType([{ x: 1 }, { x: 'one' }], 'x')).toBe(DataFieldType.Categorical);
    expect(inferFieldType([{ x: null }, { x: Number.NaN }], 'x')).toBe(DataFieldType.Categorical);
    expect(inferCategoryDomain(['beta', 2, 'alpha', 'beta', null])).toEqual(['beta', 2, 'alpha']);
    expect(inferCategoryDomain([Number.NaN, Infinity, -Infinity, 1, 'alpha'])).toEqual([1, 'alpha']);
  });

  it('在运行时规范化之前拒绝重复或未知的模型字段', () => {
    expect(() =>
      resolveFieldTypes(
        [
          { name: 'value', type: DataFieldType.Continuous },
          { name: 'value', type: DataFieldType.Categorical },
        ],
        [{ value: 1 }],
        new Set(['value']),
      ),
    ).toThrow('data: duplicate field "value" in data.model');
    expect(() => resolveFieldTypes([{ name: 'value' }], [{ other: 1 }], new Set(['other']))).toThrow(
      'data: unknown field "other"',
    );
  });

  it('使用物理路径上下文应用解析器类型和解析器覆盖', () => {
    const baseTypes: DataFieldTypeMap = new Map([
      ['amount', DataFieldType.Categorical],
      ['group', DataFieldType.Categorical],
    ]);
    const seen: Array<{ field: string; physicalPath: string; declaredType: string | undefined }> = [];
    const result = applyFieldResolver(
      baseTypes,
      new Set(['amount', 'group']),
      [{ name: 'amount' }, { name: 'group', type: DataFieldType.Categorical }],
      'sales',
      { amount: 'raw.amount' },
      (field, context) => {
        seen.push({ field, physicalPath: context.physicalPath, declaredType: context.declaredType });
        return field === 'amount'
          ? { type: DataFieldType.Continuous, parse: raw => Number(String(raw).replace('$', '')) }
          : undefined;
      },
    );

    expect(seen).toEqual([
      { field: 'amount', physicalPath: 'raw.amount', declaredType: undefined },
      { field: 'group', physicalPath: 'group', declaredType: DataFieldType.Categorical },
    ]);
    expect(result.fieldTypeMap.get('amount')).toBe(DataFieldType.Continuous);
    expect(result.parsers.get('amount')?.('$12')).toBe(12);
    expect(result.resolverHit).toBe(true);
    expect(baseTypes.get('amount')).toBe(DataFieldType.Categorical);
  });

  it('当解析器添加无类型解析器时需要测量类型', () => {
    expect(() =>
      applyFieldResolver(
        new Map([['value', DataFieldType.Categorical]]),
        new Set(['value']),
        undefined,
        'source',
        undefined,
        () => ({ parse: raw => String(raw) }),
      ),
    ).toThrow('data: resolveField parse for "value" needs a type');
  });

  it('规范化逻辑字段而不改变源行', () => {
    const source: Array<ExternalRow> = [{ raw: { amount: '$12' }, group: true }];
    const normalized = normalizeRows(
      source,
      new Map([
        ['amount', DataFieldType.Continuous],
        ['group', DataFieldType.Categorical],
      ]),
      { amount: 'raw.amount' },
      new Map([['amount', raw => Number(String(raw).replace('$', ''))]]),
    );

    expect(normalized).toEqual([{ raw: { amount: '$12' }, amount: 12, group: 'true' }]);
    expect(source).toEqual([{ raw: { amount: '$12' }, group: true }]);
  });

  it('分别诊断采样的无效值和缺失值', () => {
    const types: DataFieldTypeMap = new Map([['value', DataFieldType.Continuous]]);
    const rows: Array<ExternalRow> = [{ value: null }, { value: 'bad' }, { value: 3 }];

    expect(() => validateBoundData(rows, types, 2)).toThrow(
      'data: field "value" has no valid values in the sampled data: 1/2 invalid, 1/2 missing',
    );
    expect(() => validateBoundData(rows, types, 3)).not.toThrow();
  });

  it('报告严格模式下第一个无效的规范化行', () => {
    const types: DataFieldTypeMap = new Map([['value', DataFieldType.Continuous]]);

    expect(() => assertAllValuesValid([{ value: 1 }, { value: Number.NaN }], types)).toThrow(
      'data: field "value" has missing or invalid at row 1',
    );
  });
});
