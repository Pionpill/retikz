import { describe, expect, it } from 'vitest';

import { TableCellPayloadSchema, TablePresentationRefSchema } from '../../src';

describe('Table Cell payload schema', () => {
  it.each(['Revenue', 42, true, null])('accepts JSON scalar value payload %j', value => {
    const payload = { kind: 'value', value };

    expect(TableCellPayloadSchema.parse(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });

  it('accepts direct Core child and nested composite content', () => {
    const nodePayload = {
      kind: 'content',
      content: { type: 'node', position: [0, 0], text: 'Revenue' },
    };
    const compositePayload = {
      kind: 'content',
      content: { namespace: 'badge', type: 'status', value: 'ok' },
    };

    expect(TableCellPayloadSchema.parse(nodePayload)).toEqual(nodePayload);
    expect(TableCellPayloadSchema.parse(compositePayload)).toEqual(compositePayload);
  });

  it('rejects non-scalar values and invalid Core children', () => {
    expect(() => TableCellPayloadSchema.parse({ kind: 'value', value: { amount: 42 } })).toThrow();
    expect(() => TableCellPayloadSchema.parse({ kind: 'value', value: undefined })).toThrow();
    expect(() => TableCellPayloadSchema.parse({ kind: 'content', content: { type: 'unknown' } })).toThrow();
  });

  it('requires a non-empty presentation name and JSON object options', () => {
    expect(TablePresentationRefSchema.parse({ name: 'text', options: {} })).toEqual({ name: 'text', options: {} });
    expect(TablePresentationRefSchema.parse({ name: ' text ' })).toEqual({ name: ' text ' });
    expect(() => TablePresentationRefSchema.parse({ name: '' })).toThrow();
    expect(() => TablePresentationRefSchema.parse({ name: '   ' })).toThrow();
    expect(() => TablePresentationRefSchema.parse({ name: 'text', options: { format: () => 'x' } })).toThrow();
  });
});
