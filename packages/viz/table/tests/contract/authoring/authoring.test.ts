import { describe, expect, it } from 'vitest';

import type { DetailTableInput, ManualTableInput } from '../../../src';

import { createDetailTableIR, createManualTableIR, TABLE_NAMESPACE, TableComposite, TableSchema } from '../../../src';

describe('Table plain authoring', () => {
  it('normalizes detail string headers and keeps header false', () => {
    const input: DetailTableInput = {
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

    expect(createDetailTableIR(input)).toEqual({
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
    const columns: DetailTableInput['columns'] = [{ id: 'name', field: 'name', header: 'Name' }];
    const model: NonNullable<DetailTableInput['model']> = [{ name: 'name' }];
    const input: DetailTableInput = { dataRef: 'people', columns, model };
    const before = structuredClone(input);
    const spec = createDetailTableIR(input);
    expect(input).toEqual(before);
    expect(spec.structure.kind).toBe('detail');
    expect(spec.structure.columns).not.toBe(columns);
    expect(spec.data.model).not.toBe(model);
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
    expect(TableSchema.parse(spec)).toEqual(spec);
  });

  it('preserves and detaches detail formatter, rules, encodings, and Table tokens', () => {
    const formatter = { name: 'number', options: { maximumFractionDigits: 1 } };
    const rules: NonNullable<DetailTableInput['rules']> = [
      { selector: { fields: ['score'] }, appearance: { content: { color: '#b91c1c' } } },
    ];
    const encodings: NonNullable<DetailTableInput['encodings']> = [
      {
        id: 'score-color',
        selector: { fields: ['score'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const tableThemeTokens = { 'cell.content.color': '#27272a' } as const;
    const input: DetailTableInput = {
      dataRef: 'scores',
      columns: [{ id: 'score', field: 'score', formatter }],
      rules,
      encodings,
      tableThemeTokens,
    };
    const spec = createDetailTableIR(input);

    expect(spec).toMatchObject({
      structure: { columns: [{ id: 'score', field: 'score', formatter }] },
      rules,
      encodings,
      tableThemeTokens,
    });
    expect(spec.structure.columns[0]).not.toBe(input.columns[0]);
    expect(spec.rules).not.toBe(rules);
    expect(spec.encodings).not.toBe(encodings);
    expect(spec.tableThemeTokens).not.toBe(tableThemeTokens);

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
    const rows: ManualTableInput['rows'] = [
      ['Name', 'Score'],
      ['Ada', { id: 'score', value: 98, location: 'body', roles: ['data'] }],
    ];
    const rowKinds: NonNullable<ManualTableInput['rowKinds']> = ['columnHeader', 'body'];
    const input: ManualTableInput = {
      id: 'scores',
      rows,
      rowKinds,
    };
    const before = structuredClone(input);
    const spec = createManualTableIR(input);
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
    expect(TableSchema.parse(spec)).toEqual(spec);
  });

  it('preserves and detaches manual formatter, rules, encodings, and Table tokens', () => {
    const rows: ManualTableInput['rows'] = [
      [{ value: 98, formatter: { name: 'number', options: { maximumFractionDigits: 0 } } }],
    ];
    const rules: NonNullable<ManualTableInput['rules']> = [
      { selector: { cellIds: ['cell.r0.c0'] }, appearance: { background: { fill: '#fef2f2' } } },
    ];
    const encodings: NonNullable<ManualTableInput['encodings']> = [
      {
        id: 'score-color',
        selector: { locations: ['body'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const tableThemeTokens = { 'cell.background.fill': '#18181b' } as const;
    const input: ManualTableInput = {
      rows,
      rules,
      encodings,
      tableThemeTokens,
    };
    const spec = createManualTableIR(input);

    expect(spec).toMatchObject({
      structure: { rows },
      rules,
      encodings,
      tableThemeTokens,
    });
    expect(spec.structure.rows).not.toBe(rows);
    expect(spec.structure.rows[0]?.[0]).not.toBe(rows[0]?.[0]);
    expect(spec.rules).not.toBe(rules);
    expect(spec.encodings).not.toBe(encodings);
    expect(spec.tableThemeTokens).not.toBe(tableThemeTokens);

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
    expect(() => createDetailTableIR({ dataRef: '', columns: [] })).toThrow();
    expect(() => createManualTableIR({ rows: [] })).toThrow();
    expect(() =>
      createManualTableIR({
        rows: [['A']],
        rowKinds: ['body', 'body'],
      }),
    ).toThrow(/rowKinds/i);
  });
});
