import type { IRDataReference } from '@retikz/data';

import { defineComposite } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRCustomTableSpec, IRDetailTableSpec, IRManualTableSpec, IRTableSpec } from '../../src';

import {
  CustomTableSpecSchema,
  DetailTableSpecSchema,
  ManualTableSpecSchema,
  TABLE_NAMESPACE,
  TableComposite,
  TableSpecSchema,
} from '../../src';

const manualSpec = {
  namespace: 'table',
  type: 'table',
  structure: { kind: 'manual', rows: [['value']] },
} as const;

describe('Table root spec schema', () => {
  it('exposes precise detail, manual, and custom root schemas', () => {
    const detail = DetailTableSpecSchema.parse({
      namespace: 'table',
      type: 'table',
      data: { reference: 'people' },
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
    });
    const manual = ManualTableSpecSchema.parse(manualSpec);
    const custom = CustomTableSpecSchema.parse({
      namespace: 'table',
      type: 'table',
      structure: { kind: 'summaryByRegion', field: 'region' },
    });

    expectTypeOf(detail).toEqualTypeOf<IRDetailTableSpec>();
    expectTypeOf(manual).toEqualTypeOf<IRManualTableSpec>();
    expectTypeOf(custom).toEqualTypeOf<IRCustomTableSpec>();
    expectTypeOf(detail.data).toEqualTypeOf<IRDataReference>();
    expect(detail.structure.kind).toBe('detail');
    expect(manual.structure.kind).toBe('manual');
    expect(custom.structure.kind).toBe('summaryByRegion');
  });

  it('round-trips a manual root without external data', () => {
    const parsed: IRTableSpec = TableSpecSchema.parse(JSON.parse(JSON.stringify(manualSpec)));

    expectTypeOf(parsed.data).toEqualTypeOf<IRDataReference | undefined>();
    expect(parsed).toEqual(manualSpec);
    expect(ManualTableSpecSchema.parse({ ...manualSpec, data: undefined })).toEqual({
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

    expect(TableSpecSchema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('accepts shortest non-empty identities and JSON-safe custom structures without forcing data', () => {
    const spec = {
      namespace: 'table',
      type: 'table',
      id: 't',
      structure: { kind: 'summaryByRegion', field: 'region' },
      data: { reference: 'd' },
    };

    expect(TableSpecSchema.parse(spec)).toEqual(spec);
    expect(TableSpecSchema.parse({ ...spec, data: undefined })).toEqual({ ...spec, data: undefined });
  });

  it.each([
    [{ type: 'table', structure: manualSpec.structure }],
    [{ namespace: 'table', structure: manualSpec.structure }],
    [{ namespace: 'table', type: 'table' }],
    [{ ...manualSpec, namespace: 'plot' }],
    [{ ...manualSpec, type: 'detail' }],
  ])('rejects missing or incorrect root discriminators and structure: %j', invalid => {
    expect(() => TableSpecSchema.parse(invalid)).toThrow();
  });

  it('requires data for detail and rejects unused data for manual structures', () => {
    const detailWithoutData = {
      namespace: 'table',
      type: 'table',
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
    };
    const manualWithData = { ...manualSpec, data: { reference: 'people' } };

    expect(() => TableSpecSchema.parse(detailWithoutData)).toThrow(/data/i);
    expect(() => TableSpecSchema.parse(manualWithData)).toThrow(/data/i);
    expect(() => DetailTableSpecSchema.parse(detailWithoutData)).toThrow(/data/i);
    expect(() => DetailTableSpecSchema.parse(manualSpec)).toThrow();
    expect(() => ManualTableSpecSchema.parse(manualWithData)).toThrow(/data/i);
    expect(() =>
      ManualTableSpecSchema.parse({
        namespace: 'table',
        type: 'table',
        structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
      }),
    ).toThrow();
  });

  it('keeps rows, functions, and non-JSON metadata outside the IR', () => {
    expect(() => TableSpecSchema.parse({ ...manualSpec, data: { reference: 'people', rows: [] } })).toThrow();
    expect(() =>
      TableSpecSchema.parse({
        ...manualSpec,
        meta: { load: () => [] },
      }),
    ).toThrow();
  });

  it('extends the Core composite contract with matching literal keys', () => {
    const definition = defineComposite({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      schema: TableSpecSchema,
      expand: () => ({ type: 'scope', children: [] }),
    });

    expect(definition.schema).toBe(TableSpecSchema);
  });
});
