import { describe, expect, it } from 'vitest';

import {
  ManualTableContentCellSchema,
  ManualTableValueCellSchema,
  TableCellValuePayloadSchema,
  TableDetailColumnSchema,
  TableFormatterRefSchema,
} from '../../src';

describe('Table formatter IR', () => {
  it('parses a strict JSON formatter reference without materializing options', () => {
    const reference = TableFormatterRefSchema.parse({ name: 'number' });

    expect(reference).toEqual({ name: 'number' });
    expect(JSON.parse(JSON.stringify(reference))).toEqual(reference);
    expect(() => TableFormatterRefSchema.parse({ name: '  ' })).toThrow();
    expect(() => TableFormatterRefSchema.parse({ name: 'number', options: [] })).toThrow();
    expect(() => TableFormatterRefSchema.parse({ name: 'number', unknown: true })).toThrow();
  });

  it('keeps formatter and presentation as independent value payload references', () => {
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
  });

  it('accepts formatter references on rich manual values but rejects them on direct content', () => {
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

  it('accepts a formatter for detail body values without changing the header payload', () => {
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
