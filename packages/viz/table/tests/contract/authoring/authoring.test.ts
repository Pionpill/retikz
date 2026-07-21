import { describe, expect, it } from 'vitest';

import type { DetailTableSpecInput, ManualTableSpecInput } from '../../../src';

import {
  createDetailTableSpec,
  createManualTableSpec,
  TABLE_NAMESPACE,
  TableComposite,
  TableSpecSchema,
} from '../../../src';

describe('Table plain authoring', () => {
  it('normalizes detail string headers and keeps header false', () => {
    const input: DetailTableSpecInput = {
      id: 'sales',
      dataRef: 'sales-data',
      model: [{ name: 'score', type: 'continuous' }],
      header: false,
      columns: [
        { id: 'name', field: 'name', header: 'Name' },
        { id: 'score', field: 'score', header: { kind: 'value', value: 100 } },
      ],
      layout: { columnWidth: 96 },
      meta: { source: 'fixture' },
    };

    expect(createDetailTableSpec(input)).toEqual({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'sales',
      data: {
        reference: 'sales-data',
        model: [{ name: 'score', type: 'continuous' }],
      },
      structure: {
        kind: 'detail',
        header: false,
        columns: [
          { id: 'name', field: 'name', header: { kind: 'value', value: 'Name' } },
          { id: 'score', field: 'score', header: { kind: 'value', value: 100 } },
        ],
      },
      layout: { columnWidth: 96 },
      meta: { source: 'fixture' },
    });
  });

  it('returns detached JSON-safe specs without modifying detail input', () => {
    const columns: DetailTableSpecInput['columns'] = [{ id: 'name', field: 'name', header: 'Name' }];
    const model: NonNullable<DetailTableSpecInput['model']> = [{ name: 'name' }];
    const input: DetailTableSpecInput = { dataRef: 'people', columns, model };
    const before = structuredClone(input);
    const spec = createDetailTableSpec(input);

    expect(input).toEqual(before);
    expect(spec.structure.kind).toBe('detail');
    if (spec.structure.kind !== 'detail') throw new Error('expected detail structure');
    expect(spec.structure.columns).not.toBe(columns);
    expect(spec.data?.model).not.toBe(model);
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
    expect(TableSpecSchema.parse(spec)).toEqual(spec);
  });

  it('assembles manual structure without inferring dimensions, row kinds, addresses, or semantics', () => {
    const cells: ManualTableSpecInput['cells'] = [
      {
        id: 'score',
        address: { row: 1, column: 0 },
        payload: { kind: 'value', value: 98 },
        location: 'body',
        roles: ['data'],
      },
    ];
    const rowKinds: NonNullable<ManualTableSpecInput['rowKinds']> = ['columnHeader', 'body'];
    const input: ManualTableSpecInput = {
      id: 'scores',
      rows: 2,
      columns: 1,
      rowKinds,
      cells,
    };
    const before = structuredClone(input);
    const spec = createManualTableSpec(input);

    expect(spec).toEqual({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'scores',
      structure: { kind: 'manual', rows: 2, columns: 1, rowKinds, cells },
    });
    expect(input).toEqual(before);
    expect(spec.structure.kind).toBe('manual');
    if (spec.structure.kind !== 'manual') throw new Error('expected manual structure');
    expect(spec.structure.rowKinds).not.toBe(rowKinds);
    expect(spec.structure.cells).not.toBe(cells);
    expect(TableSpecSchema.parse(spec)).toEqual(spec);
  });

  it('delegates invalid detail and manual inputs to the Table schema', () => {
    expect(() => createDetailTableSpec({ dataRef: '', columns: [] })).toThrow();
    expect(() => createManualTableSpec({ rows: 0, columns: 1, cells: [] })).toThrow();
    expect(() =>
      createManualTableSpec({
        rows: 1,
        columns: 1,
        rowKinds: ['body', 'body'],
        cells: [],
      }),
    ).toThrow(/rowKinds/i);
  });
});
