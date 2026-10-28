import { describe, expect, it } from 'vitest';

import type { ExternalRow } from '../../src';
import {
  coerceValue,
  BuiltinDataFieldFormat,
  DataFieldType,
  resolveDataRows,
  resolveFieldPath,
  resolveFieldTypes,
  resolveFormatRegistry,
  assertBoundData,
} from '../../src';

describe('数据字段运行时', () => {
  it('在嵌套路径之前解析精确的点键', () => {
    const row: ExternalRow = { 'user.age': 42, user: { age: 12 } };

    expect(resolveFieldPath(row, 'user.age')).toBe(42);
    expect(resolveFieldPath({ user: { age: 12 } }, 'user.age')).toBe(12);
  });

  it('将逻辑字段映射到物理路径，同时规范化行', () => {
    const rows: Array<ExternalRow> = [{ user: { age: '42' }, group: true }];
    const normalized = resolveDataRows(
      rows,
      new Map([
        ['age', DataFieldType.Continuous],
        ['group', DataFieldType.Categorical],
      ]),
      { age: 'user.age' },
    );

    expect(normalized[0]).toMatchObject({ age: 42, group: 'true' });
  });

  it('使用声明的模型字段进行严格的类型解析', () => {
    expect(() =>
      resolveFieldTypes([{ name: 'x', type: DataFieldType.Continuous }], [{ y: 1 }], new Set(['y'])),
    ).toThrow(/unknown field "y"/);
  });

  it('对于缺少的分类值返回 undefined', () => {
    expect(coerceValue(undefined, DataFieldType.Categorical)).toBeUndefined();
  });

  it('将自定义解析器输出标准化为声明的规范字段类型', () => {
    const continuous = resolveDataRows(
      [{ value: 'raw' }],
      new Map([['value', DataFieldType.Continuous]]),
      undefined,
      new Map([['value', () => '12']]),
    );
    const temporal = resolveDataRows(
      [{ value: 'raw' }],
      new Map([['value', DataFieldType.Temporal]]),
      undefined,
      new Map([['value', () => '2026-07-12']]),
    );
    const categorical = resolveDataRows(
      [{ value: 'raw' }],
      new Map([['value', DataFieldType.Categorical]]),
      undefined,
      new Map([['value', () => Number.NaN]]),
    );

    expect(continuous[0].value).toBeUndefined();
    expect(temporal[0].value).toBeUndefined();
    expect(categorical[0].value).toBeUndefined();
    expect(() => assertBoundData(continuous, new Map([['value', DataFieldType.Continuous]]), 10)).toThrow(
      /no valid values/,
    );
  });

  it('仅当值为真实的 YYYY/MM/DD 日历日期时才解析 slashDate', () => {
    const slashDate = resolveFormatRegistry().get(BuiltinDataFieldFormat.SlashDate);
    const earlyDate = new Date(0);
    earlyDate.setUTCFullYear(1, 0, 1);
    earlyDate.setUTCHours(0, 0, 0, 0);

    expect(slashDate?.parse('0001/01/01')).toBe(earlyDate.getTime());
    expect(slashDate?.parse('2024/02/29')).toBe(Date.UTC(2024, 1, 29));
    expect(Number.isNaN(slashDate?.parse('2023/02/29'))).toBe(true);
    expect(Number.isNaN(slashDate?.parse('2024/13/01'))).toBe(true);
    expect(Number.isNaN(slashDate?.parse('2024/01/32'))).toBe(true);
    expect(Number.isNaN(slashDate?.parse('2024/00/00'))).toBe(true);
  });
});
