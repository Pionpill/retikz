import { describe, expect, it } from 'vitest';

import {
  ManualTableContentCellSchema,
  ManualTableValueCellSchema,
  TableCellValuePayloadSchema,
  TableDetailColumnSchema,
  TableFormatterRefSchema,
} from '../../src';

describe('Table 格式化程序 IR', () => {
  it('解析严格的 JSON 格式化程序引用，而不具体化选项', () => {
    const reference = TableFormatterRefSchema.parse({ name: 'number' });

    expect(reference).toEqual({ name: 'number' });
    expect(JSON.parse(JSON.stringify(reference))).toEqual(reference);
    expect(() => TableFormatterRefSchema.parse({ name: '  ' })).toThrow(
      'String must contain at least one non-whitespace character.',
    );
    expect(() => TableFormatterRefSchema.parse({ name: 'number', options: [] })).toThrow();
    expect(() => TableFormatterRefSchema.parse({ name: 'number', unknown: true })).toThrow();
  });

  it('将格式化程序和表示保留为独立的值有效负载引用', () => {
    const payload = TableCellValuePayloadSchema.parse({
      kind: 'value',
      value: 12.5,
      formatter: { name: 'number', options: { specifier: '$,.2f' } },
      presentation: { name: 'text' },
    });

    expect(payload).toEqual({
      kind: 'value',
      value: 12.5,
      formatter: { name: 'number', options: { specifier: '$,.2f' } },
      presentation: { name: 'text' },
    });
    expect(() => TableCellValuePayloadSchema.parse({ kind: 'value', value: 1, presentation: { name: '  ' } })).toThrow(
      'String must contain at least one non-whitespace character.',
    );
  });

  it('接受丰富手动值的格式化程序引用，但拒绝直接内容', () => {
    expect(ManualTableValueCellSchema.parse({ value: true, formatter: { name: 'boolean' } })).toMatchObject({
      formatter: { name: 'boolean' },
    });
    expect(() =>
      ManualTableContentCellSchema.parse({
        content: { type: 'node', position: [0, 0], text: 'direct' },
        formatter: { name: 'identity' },
      }),
    ).toThrow();
  });

  it('接受详细主体值的格式化程序，而不更改头部有效负载', () => {
    const column = TableDetailColumnSchema.parse({
      id: 'revenue',
      field: 'revenue',
      formatter: { name: 'number', options: { specifier: ',.2f' } },
      header: { kind: 'value', value: 'Revenue', formatter: { name: 'identity' } },
    });

    expect(column.formatter?.name).toBe('number');
    expect(column.header).toMatchObject({ formatter: { name: 'identity' } });
  });
});
