import type { IRChild } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { TableStructureOutput } from '../../src';

import {
  defineCellPresentation,
  defineTableStructure,
  normalizeTableStructure,
  presentTable,
  resolveTableStructureRegistry,
  TableCellLocation,
  TableCellRole,
  TableRowKind,
} from '../../src';

const bodyCell = (row: number, column: number, value: string | number | boolean | null) => ({
  address: { row, column },
  payload: { kind: 'value' as const, value },
});

describe('normalizeTableStructure', () => {
  it('normalizes manual cells to stable canonical identity and semantics', () => {
    const model = normalizeTableStructure({
      kind: 'manual',
      rows: 2,
      columns: 2,
      cells: [bodyCell(0, 1, 'A'), { ...bodyCell(1, 0, 2), id: 'score' }],
    });

    expect(model.rows).toEqual([
      { id: 'row.0', index: 0, kind: TableRowKind.Body },
      { id: 'row.1', index: 1, kind: TableRowKind.Body },
    ]);
    expect(model.columns).toEqual([
      { id: 'column.0', index: 0 },
      { id: 'column.1', index: 1 },
    ]);
    expect(model.cells).toEqual([
      {
        id: 'cell.r0.c1',
        rowId: 'row.0',
        columnId: 'column.1',
        rowIndex: 0,
        columnIndex: 1,
        location: TableCellLocation.Body,
        roles: [TableCellRole.Data],
        payload: { kind: 'value', value: 'A' },
        source: { kind: 'manual', cellIndex: 0 },
      },
      {
        id: 'score',
        rowId: 'row.1',
        columnId: 'column.0',
        rowIndex: 1,
        columnIndex: 0,
        location: TableCellLocation.Body,
        roles: [TableCellRole.Data],
        payload: { kind: 'value', value: 2 },
        source: { kind: 'manual', cellIndex: 1 },
      },
    ]);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.cells)).toBe(true);
    expect(Object.isFrozen(model.cells[0].payload)).toBe(true);
    expect(Object.isFrozen(model.cells[0].source)).toBe(true);
  });

  it('materializes manual header/body location and rejects semantic mismatches', () => {
    const model = normalizeTableStructure({
      kind: 'manual',
      rows: 2,
      columns: 1,
      rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body],
      cells: [bodyCell(0, 0, 'Name'), bodyCell(1, 0, 'Ada')],
    });

    expect(model.cells.map(cell => [cell.location, cell.roles])).toEqual([
      [TableCellLocation.ColumnHeader, [TableCellRole.ColumnHeader]],
      [TableCellLocation.Body, [TableCellRole.Data]],
    ]);
    expect(() =>
      normalizeTableStructure({
        kind: 'manual',
        rows: 1,
        columns: 1,
        rowKinds: [TableRowKind.ColumnHeader],
        cells: [{ ...bodyCell(0, 0, 'Name'), location: TableCellLocation.Body, roles: [TableCellRole.Data] }],
      }),
    ).toThrow(/table: structure "manual"/);
  });

  it('allows empty manual cells but rejects duplicate, out-of-range, and duplicate ids', () => {
    expect(normalizeTableStructure({ kind: 'manual', rows: 1, columns: 1, cells: [] }).cells).toEqual([]);
    expect(() =>
      normalizeTableStructure({
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [bodyCell(0, 0, 1), bodyCell(0, 0, 2)],
      }),
    ).toThrow(/address/i);
    expect(() => normalizeTableStructure({ kind: 'manual', rows: 1, columns: 1, cells: [bodyCell(1, 0, 1)] })).toThrow(
      /row/i,
    );
    expect(() =>
      normalizeTableStructure({
        kind: 'manual',
        rows: 1,
        columns: 2,
        cells: [
          { ...bodyCell(0, 0, 1), id: 'same' },
          { ...bodyCell(0, 1, 2), id: 'same' },
        ],
      }),
    ).toThrow(/duplicate.*same/i);
  });

  it('normalizes detail headers, nested fields, scalar values, and source identity', () => {
    const model = normalizeTableStructure(
      {
        kind: 'detail',
        columns: [
          { id: 'name', field: 'user.name' },
          { id: 'score', field: 'score', header: { kind: 'value', value: 'Points' } },
          { id: 'active', field: 'active' },
          { id: 'note', field: 'note' },
        ],
      },
      {
        data: { reference: 'sales' },
        datasets: { sales: [{ user: { name: 'Ada' }, score: 42, active: true, note: null }] },
      },
    );

    expect(model.rows).toEqual([
      { id: 'row.header', index: 0, kind: TableRowKind.ColumnHeader },
      { id: 'row.0', index: 1, kind: TableRowKind.Body, sourceIndex: 0 },
    ]);
    expect(model.columns).toEqual([
      { id: 'name', index: 0, field: 'user.name' },
      { id: 'score', index: 1, field: 'score' },
      { id: 'active', index: 2, field: 'active' },
      { id: 'note', index: 3, field: 'note' },
    ]);
    expect(model.cells.map(cell => cell.id)).toEqual([
      'cell.header.cname',
      'cell.header.cscore',
      'cell.header.cactive',
      'cell.header.cnote',
      'cell.r0.cname',
      'cell.r0.cscore',
      'cell.r0.cactive',
      'cell.r0.cnote',
    ]);
    expect(model.cells[4]).toMatchObject({
      payload: { kind: 'value', value: 'Ada' },
      source: { kind: 'field', reference: 'sales', sourceIndex: 0, field: 'user.name' },
    });
    expect(model.cells[7]).toMatchObject({ payload: { kind: 'value', value: null } });
  });

  it('supports header false and a model-free empty dataset', () => {
    const withoutHeader = normalizeTableStructure(
      { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
      { data: { reference: 'sales' }, datasets: { sales: [{ name: 'Ada' }] } },
    );
    const empty = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'name', field: 'missing' }] },
      { data: { reference: 'sales' }, datasets: { sales: [] } },
    );

    expect(withoutHeader.rows).toEqual([{ id: 'row.0', index: 0, kind: 'body', sourceIndex: 0 }]);
    expect(withoutHeader.cells).toHaveLength(1);
    expect(empty.rows).toEqual([{ id: 'row.header', index: 0, kind: 'columnHeader' }]);
    expect(empty.cells).toHaveLength(1);
  });

  it('fails loud for missing datasets, strict-model unknown fields, missing values, and non-scalars', () => {
    const detail = { kind: 'detail' as const, columns: [{ id: 'score', field: 'score' }] };

    expect(() => normalizeTableStructure(detail)).toThrow(/table: structure "detail"/);
    expect(() => normalizeTableStructure(detail, { data: { reference: 'sales' }, datasets: {} })).toThrow(
      /dataset.*sales/i,
    );
    expect(() =>
      normalizeTableStructure(detail, {
        data: { reference: 'sales', model: [{ name: 'name' }] },
        datasets: { sales: [] },
      }),
    ).toThrow(/unknown field.*score/i);
    expect(() => normalizeTableStructure(detail, { data: { reference: 'sales' }, datasets: { sales: [{}] } })).toThrow(
      /sourceIndex.*0.*score/i,
    );
    expect(() =>
      normalizeTableStructure(detail, { data: { reference: 'sales' }, datasets: { sales: [{ score: [42] }] } }),
    ).toThrow(/scalar/i);
  });

  it('dispatches custom structures and validates their output through the canonical guard', () => {
    const summary = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('summary'), label: z.string() }),
      build: spec => ({
        rows: [{ id: 'row.summary', kind: TableRowKind.Body }],
        columns: [{ id: 'column.summary' }],
        cells: [
          {
            id: 'cell.summary',
            row: 0,
            column: 0,
            payload: { kind: 'value', value: spec.label },
            location: TableCellLocation.Body,
            roles: [TableCellRole.Data],
            source: { kind: 'generated', structureKind: 'summary' },
          },
        ],
      }),
    });
    const model = normalizeTableStructure({ kind: 'summary', label: 'Total' }, { structureDefinitions: [summary] });

    expect(model.cells[0]).toMatchObject({
      id: 'cell.summary',
      payload: { kind: 'value', value: 'Total' },
      source: { kind: 'generated', structureKind: 'summary' },
    });

    const invalid = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('invalid') }),
      build: () =>
        ({
          rows: [],
          columns: [],
          cells: [],
          mutate: () => undefined,
        }) as unknown as TableStructureOutput,
    });
    expect(() => normalizeTableStructure({ kind: 'invalid' }, { structureDefinitions: [invalid] })).toThrow(
      /table: structure "invalid"/,
    );
  });

  it('rejects missing, duplicate, built-in, and future-reserved structure definitions', () => {
    const extension = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('extension') }),
      build: () => ({ rows: [], columns: [], cells: [] }),
    });
    const duplicate = defineTableStructure({ ...extension });

    expect(() => normalizeTableStructure({ kind: 'missing' })).toThrow(/not registered/i);
    expect(() => resolveTableStructureRegistry([extension, duplicate])).toThrow(/duplicate.*extension/i);

    for (const kind of ['manual', 'detail', 'pivot', 'matrix', 'custom'] as const) {
      const reserved = defineTableStructure({
        schema: z.strictObject({ kind: z.literal(kind) }),
        build: () => ({ rows: [], columns: [], cells: [] }),
      });
      expect(() => resolveTableStructureRegistry([reserved])).toThrow(new RegExp(kind, 'i'));
    }
  });

  it('presents canonical cells without changing semantic identity or order', () => {
    const semantic = normalizeTableStructure({
      kind: 'manual',
      rows: 1,
      columns: 2,
      cells: [
        bodyCell(0, 0, 'A'),
        { address: { row: 0, column: 1 }, payload: { kind: 'content', content: { type: 'node', position: [0, 0] } } },
      ],
    });
    const custom = defineCellPresentation({
      name: 'upper',
      optionsSchema: z.strictObject({}),
      present: ({ value }) => ({ type: 'node', position: [0, 0], text: String(value).toUpperCase() }),
    });
    const semanticWithCustom = normalizeTableStructure({
      kind: 'manual',
      rows: 1,
      columns: 1,
      cells: [
        {
          address: { row: 0, column: 0 },
          payload: { kind: 'value', value: 'custom', presentation: { name: 'upper' } },
        },
      ],
    });

    const presented = presentTable(semantic);
    const customPresented = presentTable(semanticWithCustom, [custom]);

    expect(presented.semantic).toBe(semantic);
    expect(presented.cells.map(cell => cell.cellId)).toEqual(semantic.cells.map(cell => cell.id));
    expect(presented.cells[0].content).toMatchObject({ text: 'A' });
    expect(presented.cells[1].content).toEqual({ type: 'node', position: [0, 0] });
    expect((customPresented.cells[0].content as IRChild & { text?: string }).text).toBe('CUSTOM');
    expect(Object.isFrozen(presented)).toBe(true);
    expect(Object.isFrozen(presented.cells)).toBe(true);
    expect(Object.isFrozen(presented.cells[0])).toBe(true);
  });
});
