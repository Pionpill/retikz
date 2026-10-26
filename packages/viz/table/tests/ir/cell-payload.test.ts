import { describe, expect, it } from 'vitest';

import { TableCellPayloadKind, TableCellPayloadSchema, TablePresentationRefSchema } from '../../src';

describe('Table Cell 有效负载 schema', () => {
  it('输出稳定的有效负载判别字段值', () => {
    expect(TableCellPayloadKind).toEqual({ Value: 'value', Content: 'content' });
  });

  it.each(['Revenue', 42, true, null])('接受 JSON 标量值有效负载 %j', value => {
    const payload = { kind: 'value', value };

    expect(TableCellPayloadSchema.parse(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });

  it('接受直接 Core 子级和嵌套复合内容', () => {
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

  it('拒绝非标量值和无效的 Core 子项', () => {
    expect(() => TableCellPayloadSchema.parse({ kind: 'value', value: { amount: 42 } })).toThrow();
    expect(() => TableCellPayloadSchema.parse({ kind: 'value', value: undefined })).toThrow();
    expect(() => TableCellPayloadSchema.parse({ kind: 'content', content: { type: 'unknown' } })).toThrow();
  });

  it('需要非空表示名称和 JSON 对象选项', () => {
    expect(TablePresentationRefSchema.parse({ name: 'text', options: {} })).toEqual({ name: 'text', options: {} });
    expect(TablePresentationRefSchema.parse({ name: ' text ' })).toEqual({ name: ' text ' });
    expect(() => TablePresentationRefSchema.parse({ name: '' })).toThrow();
    expect(() => TablePresentationRefSchema.parse({ name: '   ' })).toThrow();
    expect(() => TablePresentationRefSchema.parse({ name: 'text', options: { format: () => 'x' } })).toThrow();
  });
});
