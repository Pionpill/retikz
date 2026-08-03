import { describe, expect, expectTypeOf, it } from 'vitest';

import type { DetailTableSpecInput, IRDetailTableSpec, IRManualTableSpec, ManualTableSpecInput } from '../../../src';

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
      layout: { columnSize: { kind: 'fixed', value: 96 } },
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
      layout: { columnSize: { kind: 'fixed', value: 96 } },
      meta: { source: 'fixture' },
    });
  });

  it('returns detached JSON-safe specs without modifying detail input', () => {
    const columns: DetailTableSpecInput['columns'] = [{ id: 'name', field: 'name', header: 'Name' }];
    const model: NonNullable<DetailTableSpecInput['model']> = [{ name: 'name' }];
    const input: DetailTableSpecInput = { dataRef: 'people', columns, model };
    const before = structuredClone(input);
    const spec = createDetailTableSpec(input);

    expectTypeOf(spec).toEqualTypeOf<IRDetailTableSpec>();
    expect(input).toEqual(before);
    expect(spec.structure.kind).toBe('detail');
    expect(spec.structure.columns).not.toBe(columns);
    expect(spec.data.model).not.toBe(model);
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
    expect(TableSpecSchema.parse(spec)).toEqual(spec);
  });

  it('preserves and detaches detail formatter, rules, encodings, and style fields', () => {
    const formatter = { name: 'number', options: { maximumFractionDigits: 1 } };
    const rules: NonNullable<DetailTableSpecInput['rules']> = [
      { selector: { fields: ['score'] }, appearance: { content: { color: '#b91c1c' } } },
    ];
    const encodings: NonNullable<DetailTableSpecInput['encodings']> = [
      {
        id: 'score-color',
        selector: { fields: ['score'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const styleTokens = { 'cell.content.color': '#27272a' } as const;
    const input: DetailTableSpecInput = {
      dataRef: 'scores',
      columns: [{ id: 'score', field: 'score', formatter }],
      rules,
      encodings,
      style: 'academic',
      themeMode: 'dark',
      styleTokens,
    };
    const spec = createDetailTableSpec(input);

    expect(spec).toMatchObject({
      structure: { columns: [{ id: 'score', field: 'score', formatter }] },
      rules,
      encodings,
      style: 'academic',
      themeMode: 'dark',
      styleTokens,
    });
    expect(spec.structure.columns[0]).not.toBe(input.columns[0]);
    expect(spec.rules).not.toBe(rules);
    expect(spec.encodings).not.toBe(encodings);
    expect(spec.styleTokens).not.toBe(styleTokens);

    formatter.options.maximumFractionDigits = 3;
    rules[0].selector.fields!.push('ignored');
    encodings[0].selector.fields!.push('ignored');

    expect(spec.structure.columns[0]?.formatter).toEqual({
      name: 'number',
      options: { maximumFractionDigits: 1 },
    });
    expect(spec.rules?.[0]?.selector.fields).toEqual(['score']);
    expect(spec.encodings?.[0]?.selector.fields).toEqual(['score']);
  });

  it('assembles a row-major manual structure without modifying its input', () => {
    const rows: ManualTableSpecInput['rows'] = [
      ['Name', 'Score'],
      ['Ada', { id: 'score', value: 98, location: 'body', roles: ['data'] }],
    ];
    const rowKinds: NonNullable<ManualTableSpecInput['rowKinds']> = ['columnHeader', 'body'];
    const input: ManualTableSpecInput = {
      id: 'scores',
      rows,
      rowKinds,
    };
    const before = structuredClone(input);
    const spec = createManualTableSpec(input);

    expectTypeOf(spec).toEqualTypeOf<IRManualTableSpec>();
    expect(spec).toEqual({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'scores',
      structure: { kind: 'manual', rows, rowKinds },
    });
    expect(input).toEqual(before);
    expect(spec.structure.kind).toBe('manual');
    expect(spec.structure.rowKinds).not.toBe(rowKinds);
    expect(spec.structure.rows).not.toBe(rows);
    expect('data' in spec).toBe(false);
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
    expect(TableSpecSchema.parse(spec)).toEqual(spec);
  });

  it('preserves and detaches manual formatter, rules, encodings, and style fields', () => {
    const rows: ManualTableSpecInput['rows'] = [
      [{ value: 98, formatter: { name: 'number', options: { maximumFractionDigits: 0 } } }],
    ];
    const rules: NonNullable<ManualTableSpecInput['rules']> = [
      { selector: { cellIds: ['cell.r0.c0'] }, appearance: { background: { fill: '#fef2f2' } } },
    ];
    const encodings: NonNullable<ManualTableSpecInput['encodings']> = [
      {
        id: 'score-color',
        selector: { locations: ['body'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const styleTokens = { 'cell.background.fill': '#18181b' } as const;
    const input: ManualTableSpecInput = {
      rows,
      rules,
      encodings,
      style: 'vibrant',
      themeMode: 'light',
      styleTokens,
    };
    const spec = createManualTableSpec(input);

    expect(spec).toMatchObject({
      structure: { rows },
      rules,
      encodings,
      style: 'vibrant',
      themeMode: 'light',
      styleTokens,
    });
    expect(spec.structure.rows).not.toBe(rows);
    expect(spec.structure.rows[0]?.[0]).not.toBe(rows[0]?.[0]);
    expect(spec.rules).not.toBe(rules);
    expect(spec.encodings).not.toBe(encodings);
    expect(spec.styleTokens).not.toBe(styleTokens);

    const inputCell = rows[0]?.[0];
    if (typeof inputCell !== 'object' || inputCell === null || !('formatter' in inputCell)) {
      throw new Error('expected rich value Cell fixture');
    }
    inputCell.formatter!.options!.maximumFractionDigits = 2;
    rules[0].selector.cellIds!.push('ignored');
    encodings[0].selector.locations!.push('columnHeader');

    expect(spec.structure.rows[0]?.[0]).toEqual({
      value: 98,
      formatter: { name: 'number', options: { maximumFractionDigits: 0 } },
    });
    expect(spec.rules?.[0]?.selector.cellIds).toEqual(['cell.r0.c0']);
    expect(spec.encodings?.[0]?.selector.locations).toEqual(['body']);
  });

  it('delegates invalid detail and manual inputs to the Table schema', () => {
    expect(() => createDetailTableSpec({ dataRef: '', columns: [] })).toThrow();
    expect(() => createManualTableSpec({ rows: [] })).toThrow();
    expect(() =>
      createManualTableSpec({
        rows: [['A']],
        rowKinds: ['body', 'body'],
      }),
    ).toThrow(/rowKinds/i);
  });
});
