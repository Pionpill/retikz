import { describe, expect, it } from 'vitest';

import type { InputDetailTableConfig, InputManualTableConfig } from '../../../src';
import { createDetailTableIR, createManualTableIR, TABLE_NAMESPACE, TableComposite, TableSchema } from '../../../src';

describe('Table 简单编写', () => {
  it('标准化详细字符串头部并保持头部为 false', () => {
    const input: InputDetailTableConfig = {
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

  it('返回分离的 JSON 安全规格，而不修改详细输入', () => {
    const columns: InputDetailTableConfig['columns'] = [{ id: 'name', field: 'name', header: 'Name' }];
    const model: NonNullable<InputDetailTableConfig['model']> = [{ name: 'name' }];
    const input: InputDetailTableConfig = { dataRef: 'people', columns, model };
    const before = structuredClone(input);
    const spec = createDetailTableIR(input);

    expect(input).toEqual(before);
    expect(spec.structure.kind).toBe('detail');
    expect(spec.structure.columns).not.toBe(columns);
    expect(spec.data.model).not.toBe(model);
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
    expect(TableSchema.parse(spec)).toEqual(spec);
  });

  it('保留和分离详细格式化程序、规则、编码和 Source 默认值', () => {
    const formatter = { name: 'number', options: { maximumFractionDigits: 1 } };
    const rules: NonNullable<InputDetailTableConfig['rules']> = [
      {
        selector: { fields: ['score'] },
        appearance: {
          content: {
            defaults: { style: { color: '#b91c1c' } },
          },
        },
      },
    ];
    const encodings: NonNullable<InputDetailTableConfig['encodings']> = [
      {
        id: 'score-color',
        selector: { fields: ['score'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const defaultTable = {
      defaultAppearance: { body: { content: { defaults: { style: { color: '#27272a' } } } } },
    } as const;
    const input: InputDetailTableConfig = {
      dataRef: 'scores',
      columns: [{ id: 'score', field: 'score', formatter }],
      rules,
      encodings,
      defaultTable,
    };
    const spec = createDetailTableIR(input);

    expect(spec).toMatchObject({
      structure: { columns: [{ id: 'score', field: 'score', formatter }] },
      rules,
      encodings,
      defaultTable,
    });
    expect(spec.structure.columns[0]).not.toBe(input.columns[0]);
    expect(spec.rules).not.toBe(rules);
    expect(spec.encodings).not.toBe(encodings);
    expect(spec.defaultTable).not.toBe(defaultTable);

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

  it('组装行优先手动结构而不修改其输入', () => {
    const rows: InputManualTableConfig['rows'] = [
      ['Name', 'Score'],
      ['Ada', { id: 'score', value: 98, location: 'body', roles: ['data'] }],
    ];
    const rowKinds: NonNullable<InputManualTableConfig['rowKinds']> = ['columnHeader', 'body'];
    const input: InputManualTableConfig = {
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

  it('保留和分离手动格式化程序、规则、编码和 Source 默认值', () => {
    const rows: InputManualTableConfig['rows'] = [
      [{ value: 98, formatter: { name: 'number', options: { maximumFractionDigits: 0 } } }],
    ];
    const rules: NonNullable<InputManualTableConfig['rules']> = [
      { selector: { cellIds: ['cell.r0.c0'] }, appearance: { background: { fill: '#fef2f2' } } },
    ];
    const encodings: NonNullable<InputManualTableConfig['encodings']> = [
      {
        id: 'score-color',
        selector: { locations: ['body'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const defaultTable = { defaultAppearance: { body: { background: { fill: '#18181b' } } } } as const;
    const input: InputManualTableConfig = {
      rows,
      rules,
      encodings,
      defaultTable,
    };
    const spec = createManualTableIR(input);

    expect(spec).toMatchObject({
      structure: { rows },
      rules,
      encodings,
      defaultTable,
    });
    expect(spec.structure.rows).not.toBe(rows);
    expect(spec.structure.rows[0]?.[0]).not.toBe(rows[0]?.[0]);
    expect(spec.rules).not.toBe(rules);
    expect(spec.encodings).not.toBe(encodings);
    expect(spec.defaultTable).not.toBe(defaultTable);

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

  it('验证 Table schema 边界处的外部详细信息和手动记录', () => {
    expect(() => TableSchema.parse(createDetailTableIR({ dataRef: '', columns: [] }))).toThrow();
    expect(() => TableSchema.parse(createManualTableIR({ rows: [] }))).toThrow();
    expect(() =>
      TableSchema.parse(
        createManualTableIR({
          rows: [['A']],
          rowKinds: ['body', 'body'],
        }),
      ),
    ).toThrow(/rowKinds/i);
  });
});
