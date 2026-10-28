import { defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRTable } from '../../src';
import {
  CustomTableSchema,
  DetailTableSchema,
  ManualTableSchema,
  TABLE_NAMESPACE,
  TableComposite,
  TableSchema,
} from '../../src';

const manualSpec = {
  namespace: 'table',
  type: 'table',
  structure: { kind: 'manual', rows: [['value']] },
} as const;

describe('Table 根规范 schema', () => {
  it('公开精确的细节、手动和自定义根 schema', () => {
    const detail = DetailTableSchema.parse({
      namespace: 'table',
      type: 'table',
      data: { reference: 'people' },
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
    });
    const manual = ManualTableSchema.parse(manualSpec);
    const custom = CustomTableSchema.parse({
      namespace: 'table',
      type: 'table',
      structure: { kind: 'summaryByRegion', field: 'region' },
    });

    expect(detail.structure.kind).toBe('detail');
    expect(manual.structure.kind).toBe('manual');
    expect(custom.structure.kind).toBe('summaryByRegion');
  });

  it('无需外部数据即可往返手动根', () => {
    const parsed: IRTable = TableSchema.parse(JSON.parse(JSON.stringify(manualSpec)));

    expect(parsed).toEqual(manualSpec);
    expect(ManualTableSchema.parse({ ...manualSpec, data: undefined })).toEqual({
      ...manualSpec,
      data: undefined,
    });
  });

  it('接受详细数据引用并保留 id、布局和 JSON 元数据', () => {
    const spec = {
      namespace: 'table',
      type: 'table',
      id: 'people-table',
      data: { reference: 'people' },
      structure: {
        kind: 'detail',
        columns: [{ id: 'name', field: 'name' }],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 96 },
        rowSize: { kind: 'fixed', value: 28 },
      },
      meta: { source: 'example', nested: { visible: true }, tags: ['people', null] },
    };

    expect(TableSchema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('接受最短的非空身份和 JSON 安全的自定义结构，而不强制数据', () => {
    const spec = {
      namespace: 'table',
      type: 'table',
      id: 't',
      structure: { kind: 'summaryByRegion', field: 'region' },
      data: { reference: 'd' },
    };

    expect(TableSchema.parse(spec)).toEqual(spec);
    expect(TableSchema.parse({ ...spec, data: undefined })).toEqual({ ...spec, data: undefined });
  });

  it.each([
    [{ type: 'table', structure: manualSpec.structure }],
    [{ namespace: 'table', structure: manualSpec.structure }],
    [{ namespace: 'table', type: 'table' }],
    [{ ...manualSpec, namespace: 'plot' }],
    [{ ...manualSpec, type: 'detail' }],
  ])('拒绝丢失或不正确的根判别字段和结构：%j', invalid => {
    expect(() => TableSchema.parse(invalid)).toThrow();
  });

  it('需要详细数据，拒绝手动结构未使用的数据', () => {
    const detailWithoutData = {
      namespace: 'table',
      type: 'table',
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
    };
    const manualWithData = { ...manualSpec, data: { reference: 'people' } };

    expect(() => TableSchema.parse(detailWithoutData)).toThrow(/data/i);
    expect(() => TableSchema.parse(manualWithData)).toThrow(/data/i);
    expect(() => DetailTableSchema.parse(detailWithoutData)).toThrow(/data/i);
    expect(() => DetailTableSchema.parse(manualSpec)).toThrow();
    expect(() => ManualTableSchema.parse(manualWithData)).toThrow(/data/i);
    expect(() =>
      ManualTableSchema.parse({
        namespace: 'table',
        type: 'table',
        structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
      }),
    ).toThrow();
  });

  it('将行、函数和非 JSON 元数据保留在 IR 之外', () => {
    expect(() => TableSchema.parse({ ...manualSpec, data: { reference: 'people', rows: [] } })).toThrow();
    expect(() =>
      TableSchema.parse({
        ...manualSpec,
        meta: { load: () => [] },
      }),
    ).toThrow();
  });

  it('使用匹配的字面量键扩展 Core 复合契约', () => {
    const definition = defineComposite({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      schema: TableSchema,
      compile: () => ({ children: [{ type: 'scope', children: [] }] }),
    });

    expect(definition.schema).toBe(TableSchema);
  });
});
