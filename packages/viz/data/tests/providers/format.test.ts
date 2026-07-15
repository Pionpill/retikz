import { describe, expect, it } from 'vitest';

import type { DataFieldTypeMap } from '../../src';

import {
  collectFormatFields,
  DataFieldFormat,
  DataFieldType,
  defineFieldFormat,
  isBuiltinFieldFormat,
  resolveFormatRegistry,
} from '../../src';

/** 读取已注册内置 format；缺失时让测试直接失败 */
const formatOf = (name: string) => {
  const definition = resolveFormatRegistry().get(name);
  if (definition === undefined) throw new Error(`missing test format: ${name}`);
  return definition;
};

describe('field format provider runtime', () => {
  it('parses all built-in temporal formats and rejects invalid inputs', () => {
    const iso = formatOf(DataFieldFormat.Iso);
    const epochSeconds = formatOf(DataFieldFormat.EpochSeconds);
    const epochMillis = formatOf(DataFieldFormat.EpochMillis);
    const slashDate = formatOf(DataFieldFormat.SlashDate);

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

  it('parses built-in numeric string and percent formats', () => {
    const numberString = formatOf(DataFieldFormat.NumberString);
    const percent = formatOf(DataFieldFormat.Percent);

    expect(numberString.parse(' 1,234.5 ')).toBe(1234.5);
    expect(numberString.parse(12)).toBe(12);
    expect(percent.parse('12.5%')).toBe(0.125);
    expect(percent.parse(50)).toBe(0.5);

    for (const value of ['', 'abc', Number.NaN]) expect(Number.isNaN(numberString.parse(value))).toBe(true);
    for (const value of ['', '50', '%', Number.POSITIVE_INFINITY]) {
      expect(Number.isNaN(percent.parse(value))).toBe(true);
    }
  });

  it('recognizes only built-in format names', () => {
    for (const format of Object.values(DataFieldFormat)) expect(isBuiltinFieldFormat(format)).toBe(true);
    expect(isBuiltinFieldFormat('currency')).toBe(false);
  });

  it('registers custom formats without mutating subsequent registries', () => {
    const currency = defineFieldFormat({
      name: 'currency',
      impliedType: DataFieldType.Continuous,
      parse: raw => Number(String(raw).replace('$', '')),
    });
    const registry = resolveFormatRegistry([currency]);

    expect(registry.get('currency')?.parse('$12')).toBe(12);
    expect(resolveFormatRegistry().has('currency')).toBe(false);
  });

  it('rejects empty and duplicate format registrations', () => {
    const empty = defineFieldFormat({
      name: '',
      impliedType: DataFieldType.Continuous,
      parse: () => 0,
    });
    const duplicateBuiltin = defineFieldFormat({
      name: DataFieldFormat.Percent,
      impliedType: DataFieldType.Continuous,
      parse: () => 0,
    });
    const duplicateCustom = defineFieldFormat({
      name: 'currency',
      impliedType: DataFieldType.Continuous,
      parse: () => 0,
    });

    expect(() => resolveFormatRegistry([empty])).toThrow('data: field format name must be a non-empty string');
    expect(() => resolveFormatRegistry([duplicateBuiltin])).toThrow(
      'data: duplicate field format registration: "percent"',
    );
    expect(() => resolveFormatRegistry([duplicateCustom, duplicateCustom])).toThrow(
      'data: duplicate field format registration: "currency"',
    );
  });

  it('collects parsers and implied types only for referenced model fields', () => {
    const baseTypes: DataFieldTypeMap = new Map([
      ['amount', DataFieldType.Categorical],
      ['createdAt', DataFieldType.Categorical],
    ]);
    const result = collectFormatFields(
      [
        { name: 'amount', format: DataFieldFormat.Percent },
        { name: 'createdAt', type: DataFieldType.Temporal, format: DataFieldFormat.EpochMillis },
        { name: 'unused', format: 'not-registered' },
      ],
      baseTypes,
      new Set(['amount', 'createdAt']),
    );

    expect(result.fieldTypes.get('amount')).toBe(DataFieldType.Continuous);
    expect(result.fieldTypes.get('createdAt')).toBe(DataFieldType.Temporal);
    expect(result.parsers.get('amount')?.('25%')).toBe(0.25);
    expect(result.parsers.get('createdAt')?.('1500')).toBe(1500);
    expect(result.parsers.has('unused')).toBe(false);
    expect(baseTypes.get('amount')).toBe(DataFieldType.Categorical);
  });

  it('fails loud for unknown formats and explicit type conflicts', () => {
    expect(() =>
      collectFormatFields(
        [{ name: 'value', format: 'not-registered' }],
        new Map([['value', DataFieldType.Categorical]]),
        new Set(['value']),
      ),
    ).toThrow('data: field format "not-registered" is not registered');
    expect(() =>
      collectFormatFields(
        [{ name: 'value', type: DataFieldType.Categorical, format: DataFieldFormat.Percent }],
        new Map([['value', DataFieldType.Categorical]]),
        new Set(['value']),
      ),
    ).toThrow('declares type "categorical" but format "percent" implies "continuous"');
  });
});
