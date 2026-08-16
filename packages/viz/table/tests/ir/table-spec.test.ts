import type { IRDataReference } from '@retikz/data';

import { defineComposite } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRCustomTable, IRDetailTable, IRManualTable, IRTable } from '../../src';

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

describe('Table root spec schema', () => {
  it('exposes precise detail, manual, and custom root schemas', () => {
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

    expectTypeOf(detail).toEqualTypeOf<IRDetailTable>();
    expectTypeOf(manual).toEqualTypeOf<IRManualTable>();
    expectTypeOf(custom).toEqualTypeOf<IRCustomTable>();
    expectTypeOf(detail.data).toEqualTypeOf<IRDataReference>();
    expect(detail.structure.kind).toBe('detail');
    expect(manual.structure.kind).toBe('manual');
    expect(custom.structure.kind).toBe('summaryByRegion');
  });

  it('round-trips a manual root without external data', () => {
    const parsed: IRTable = TableSchema.parse(JSON.parse(JSON.stringify(manualSpec)));

    expectTypeOf(parsed.data).toEqualTypeOf<IRDataReference | undefined>();
    expect(parsed).toEqual(manualSpec);
    expect(ManualTableSchema.parse({ ...manualSpec, data: undefined })).toEqual({
      ...manualSpec,
      data: undefined,
    });
  });

  it('accepts detail data references and preserves id, layout, and JSON metadata', () => {
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

  it('accepts shortest non-empty identities and JSON-safe custom structures without forcing data', () => {
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
  ])('rejects missing or incorrect root discriminators and structure: %j', invalid => {
    expect(() => TableSchema.parse(invalid)).toThrow();
  });

  it('requires data for detail and rejects unused data for manual structures', () => {
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

  it('keeps rows, functions, and non-JSON metadata outside the IR', () => {
    expect(() => TableSchema.parse({ ...manualSpec, data: { reference: 'people', rows: [] } })).toThrow();
    expect(() =>
      TableSchema.parse({
        ...manualSpec,
        meta: { load: () => [] },
      }),
    ).toThrow();
  });

  it('extends the Core composite contract with matching literal keys', () => {
    const definition = defineComposite({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      schema: TableSchema,
      expand: () => ({ children: [{ type: 'scope', children: [] }] }),
    });

    expect(definition.schema).toBe(TableSchema);
  });
});
