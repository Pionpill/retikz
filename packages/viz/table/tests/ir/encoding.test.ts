import { describe, expect, it } from 'vitest';

import { TableCellVisualEncodingSchema, TableSchema, TableVisualChannel, TableVisualScaleRefSchema } from '../../src';

const selector = { fields: ['score'], locations: ['body'] } as const;

describe('Table visual encoding schema', () => {
  it('round-trips the closed encoding and scale reference contract', () => {
    const encoding = TableCellVisualEncodingSchema.parse({
      id: 'score-fill',
      selector,
      channel: TableVisualChannel.BackgroundFill,
      scale: { name: 'sequential-color', options: { domain: [0, 10] } },
      legend: { title: 'Score' },
    });
    expect(JSON.parse(JSON.stringify(encoding))).toEqual(encoding);
    expect(() => TableCellVisualEncodingSchema.parse({ ...encoding, id: '' })).toThrow(/id/i);
    expect(() => TableCellVisualEncodingSchema.parse({ ...encoding, channel: 'opacity' })).toThrow(/channel/i);
    expect(() => TableCellVisualEncodingSchema.parse({ ...encoding, extra: true })).toThrow();
  });

  it('accepts only a non-empty provider name with JSON-object options', () => {
    expect(TableVisualScaleRefSchema.parse({ name: 'company-scale', options: { nested: [1, true, null] } })).toEqual({
      name: 'company-scale',
      options: { nested: [1, true, null] },
    });
    expect(() => TableVisualScaleRefSchema.parse({ name: '' })).toThrow(/name/i);
    expect(() => TableVisualScaleRefSchema.parse({ name: 'x', options: [] })).toThrow(/options/i);
    expect(() => TableVisualScaleRefSchema.parse({ name: 'x', options: { callback: () => '#fff' } })).toThrow();
  });

  it('keeps encoding order while rejecting duplicate ids', () => {
    const spec = {
      namespace: 'table',
      type: 'table',
      structure: { kind: 'manual', rows: [[1]] },
      encodings: [
        { id: 'first', selector, channel: 'contentColor', scale: { name: 'ordinal-color' } },
        { id: 'second', selector, channel: 'backgroundFill', scale: { name: 'sequential-color' } },
      ],
    };

    expect(TableSchema.parse(spec).encodings?.map(encoding => encoding.id)).toEqual(['first', 'second']);
    const withoutEncodings = Object.fromEntries(Object.entries(spec).filter(([key]) => key !== 'encodings'));
    expect(TableSchema.parse(withoutEncodings)).not.toHaveProperty('encodings');
    expect(() =>
      TableSchema.parse({ ...spec, encodings: [spec.encodings[0], { ...spec.encodings[1], id: 'first' }] }),
    ).toThrow(/encoding id/i);
  });

  it('requires an explicit root id only when a legend object is requested', () => {
    const base = {
      namespace: 'table',
      type: 'table',
      structure: { kind: 'manual', rows: [[1]] },
    };
    const encoding = { id: 'score', selector, channel: 'contentColor', scale: { name: 'ordinal-color' } };

    expect(() => TableSchema.parse({ ...base, encodings: [{ ...encoding, legend: { title: 'Score' } }] })).toThrow(
      /root id/i,
    );
    expect(TableSchema.parse({ ...base, encodings: [{ ...encoding, legend: false }] })).not.toHaveProperty('id');
    expect(TableSchema.parse({ ...base, id: 'table-1', encodings: [{ ...encoding, legend: {} }] })).toHaveProperty(
      'id',
      'table-1',
    );
  });
});
