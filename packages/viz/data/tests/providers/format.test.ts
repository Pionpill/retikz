import { describe, expect, it } from 'vitest';

import type { DataFieldTypeMap } from '../../src';
import {
  collectFormatFields,
  BuiltinDataFieldFormat,
  DataFieldType,
  defineFieldFormat,
  resolveFormatRegistry,
} from '../../src';

/** 读取已注册内置 format；缺失时让测试直接失败 */
const formatOf = (name: string) => {
  const definition = resolveFormatRegistry().get(name);
  if (definition === undefined) throw new Error(`missing test format: ${name}`);
  return definition;
};

describe('字段格式提供者运行时', () => {
  it('解析所有内置时间格式并拒绝无效输入', () => {
    const iso = formatOf(BuiltinDataFieldFormat.Iso);
    const epochSeconds = formatOf(BuiltinDataFieldFormat.EpochSeconds);
    const epochMillis = formatOf(BuiltinDataFieldFormat.EpochMillis);
    const slashDate = formatOf(BuiltinDataFieldFormat.SlashDate);

    expect(iso.parse('2024-02-29')).toBe(Date.UTC(2024, 1, 29));
    expect(Number.isNaN(iso.parse('2023-02-29'))).toBe(true);
    expect(epochSeconds.parse('1.5')).toBe(1500);
    expect(epochMillis.parse('1500')).toBe(1500);
    expect(slashDate.parse('2024/02/29')).toBe(Date.UTC(2024, 1, 29));

    for (const value of ['', 'not-a-date', Number.POSITIVE_INFINITY]) {
      expect(Number.isNaN(epochSeconds.parse(value))).toBe(true);
      expect(Number.isNaN(epochMillis.parse(value))).toBe(true);
    }

    expect(Number.isNaN(slashDate.parse('2023/02/29'))).toBe(true);
  });

  it('解析内置数字字符串和百分比格式', () => {
    const numberString = formatOf(BuiltinDataFieldFormat.NumberString);
    const percent = formatOf(BuiltinDataFieldFormat.Percent);

    expect(numberString.parse(' 1,234.5 ')).toBe(1234.5);
    expect(numberString.parse(12)).toBe(12);
    expect(percent.parse('12.5%')).toBe(0.125);
    expect(percent.parse(50)).toBe(0.5);

    for (const value of ['', 'abc', Number.NaN]) expect(Number.isNaN(numberString.parse(value))).toBe(true);

    for (const value of ['', '50', '%', Number.POSITIVE_INFINITY]) {
      expect(Number.isNaN(percent.parse(value))).toBe(true);
    }
  });

  it('注册自定义格式而不改变后续注册表', () => {
    const currency = defineFieldFormat({
      name: 'currency',
      impliedType: DataFieldType.Continuous,
      parse: raw => Number(String(raw).replace('$', '')),
    });
    const registry = resolveFormatRegistry([currency]);

    expect(registry.get('currency')?.parse('$12')).toBe(12);
    expect(resolveFormatRegistry().has('currency')).toBe(false);
  });

  it('拒绝重复格式注册', () => {
    const duplicateBuiltin = defineFieldFormat({
      name: BuiltinDataFieldFormat.Percent,
      impliedType: DataFieldType.Continuous,
      parse: () => 0,
    });
    const duplicateCustom = defineFieldFormat({
      name: 'currency',
      impliedType: DataFieldType.Continuous,
      parse: () => 0,
    });

    expect(() => resolveFormatRegistry([duplicateBuiltin])).toThrow(
      'data: duplicate field format registration: "percent"',
    );
    expect(() => resolveFormatRegistry([duplicateCustom, duplicateCustom])).toThrow(
      'data: duplicate field format registration: "currency"',
    );
  });

  it('仅收集引用模型字段的解析器和隐含类型', () => {
    const baseTypes: DataFieldTypeMap = new Map([
      ['amount', DataFieldType.Categorical],
      ['createdAt', DataFieldType.Categorical],
    ]);
    const result = collectFormatFields(
      [
        { name: 'amount', format: BuiltinDataFieldFormat.Percent },
        { name: 'createdAt', type: DataFieldType.Temporal, format: BuiltinDataFieldFormat.EpochMillis },
        { name: 'unused', format: 'not-registered' },
      ],
      baseTypes,
      new Set(['amount', 'createdAt']),
    );

    expect(result.fieldTypeMap.get('amount')).toBe(DataFieldType.Continuous);
    expect(result.fieldTypeMap.get('createdAt')).toBe(DataFieldType.Temporal);
    expect(result.parsers.get('amount')?.('25%')).toBe(0.25);
    expect(result.parsers.get('createdAt')?.('1500')).toBe(1500);
    expect(result.parsers.has('unused')).toBe(false);
    expect(baseTypes.get('amount')).toBe(DataFieldType.Categorical);
  });

  it('由于未知格式和显式类型冲突而失败', () => {
    expect(() =>
      collectFormatFields(
        [{ name: 'value', format: 'not-registered' }],
        new Map([['value', DataFieldType.Categorical]]),
        new Set(['value']),
      ),
    ).toThrow('data: field format "not-registered" is not registered');
    expect(() =>
      collectFormatFields(
        [{ name: 'value', type: DataFieldType.Categorical, format: BuiltinDataFieldFormat.Percent }],
        new Map([['value', DataFieldType.Categorical]]),
        new Set(['value']),
      ),
    ).toThrow('declares type "categorical" but format "percent" implies "continuous"');
  });
});
