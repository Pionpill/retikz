import { describe, expect, it } from 'vitest';

import type { SemanticTableModel } from '../../src';

import { layoutTable, normalizeTableStructure, resolveTableLayoutSpec, TableRowKind } from '../../src';

const manualModel = () =>
  normalizeTableStructure({
    kind: 'manual',
    rows: 2,
    columns: 3,
    rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body],
    cells: [
      { address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Name' } },
      { address: { row: 1, column: 2 }, payload: { kind: 'value', value: 'Ada' } },
    ],
  });

describe('fixed-track Table layout', () => {
  it('resolves stable defaults without rewriting the input spec', () => {
    const spec = { rowHeight: 40 };

    expect(resolveTableLayoutSpec()).toEqual({
      columnWidth: 120,
      rowHeight: 32,
      headerHeight: 32,
      columnGap: 0,
      rowGap: 0,
    });
    expect(resolveTableLayoutSpec(spec)).toEqual({
      columnWidth: 120,
      rowHeight: 40,
      headerHeight: 40,
      columnGap: 0,
      rowGap: 0,
    });
    expect(spec).toEqual({ rowHeight: 40 });
  });

  it('lays out header/body tracks, gaps, Cell boxes, and centers in declaration order', () => {
    const model = manualModel();
    const layout = layoutTable(model, {
      columnWidth: 100,
      rowHeight: 30,
      headerHeight: 40,
      columnGap: 5,
      rowGap: 3,
    });

    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 310, height: 73 });
    expect(layout.columns).toEqual([
      { id: 'column.0', index: 0, offset: 0, size: 100 },
      { id: 'column.1', index: 1, offset: 105, size: 100 },
      { id: 'column.2', index: 2, offset: 210, size: 100 },
    ]);
    expect(layout.rows).toEqual([
      { id: 'row.0', index: 0, offset: 0, size: 40 },
      { id: 'row.1', index: 1, offset: 43, size: 30 },
    ]);
    expect(layout.cells).toEqual([
      {
        cellId: 'cell.r0.c0',
        box: { x: 0, y: 0, width: 100, height: 40 },
        contentCenter: [50, 20],
      },
      {
        cellId: 'cell.r1.c2',
        box: { x: 210, y: 43, width: 100, height: 30 },
        contentCenter: [260, 58],
      },
    ]);
    expect(layout.rows.map(row => row.id)).toEqual(model.rows.map(row => row.id));
    expect(layout.columns.map(column => column.id)).toEqual(model.columns.map(column => column.id));
    expect(layout.cells.map(cell => cell.cellId)).toEqual(model.cells.map(cell => cell.id));
  });

  it('uses headerHeight for detail header and rowHeight for detail body', () => {
    const model = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
      { data: { reference: 'people' }, datasets: { people: [{ name: 'Ada' }] } },
    );
    const layout = layoutTable(model, { columnWidth: 80, headerHeight: 24, rowHeight: 36, rowGap: 2 });

    expect(layout.rows.map(row => row.size)).toEqual([24, 36]);
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 80, height: 62 });
  });

  it('does not add a trailing gap for a single track', () => {
    const model = normalizeTableStructure({ kind: 'manual', rows: 1, columns: 1, cells: [] });

    expect(layoutTable(model, { columnWidth: 10, rowHeight: 20, columnGap: 99, rowGap: 99 }).bounds).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 20,
    });
  });

  it('returns deterministic degenerate bounds for zero rows or columns', () => {
    const zeroRows: SemanticTableModel = Object.freeze({ rows: [], columns: [], cells: [] });
    const zeroColumns: SemanticTableModel = {
      rows: [
        { id: 'row.0', index: 0, kind: TableRowKind.Body },
        { id: 'row.1', index: 1, kind: TableRowKind.Body },
      ],
      columns: [],
      cells: [],
    };
    const detailEmpty = normalizeTableStructure(
      { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
      { data: { reference: 'people' }, datasets: { people: [] } },
    );

    expect(layoutTable(zeroRows)).toEqual({
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      rows: [],
      columns: [],
      cells: [],
    });
    expect(layoutTable(zeroColumns)).toMatchObject({
      bounds: { x: 0, y: 0, width: 0, height: 64 },
      columns: [],
      cells: [],
    });
    expect(layoutTable(detailEmpty).bounds).toEqual({ x: 0, y: 0, width: 120, height: 0 });
  });

  it('fails loud when a Cell no longer matches its canonical row or column', () => {
    const model = manualModel();
    const invalidRow: SemanticTableModel = {
      ...model,
      cells: [{ ...model.cells[0], rowId: 'missing' }],
    };
    const invalidColumn: SemanticTableModel = {
      ...model,
      cells: [{ ...model.cells[0], columnId: 'missing' }],
    };

    expect(() => layoutTable(invalidRow)).toThrow(/cell.*row/i);
    expect(() => layoutTable(invalidColumn)).toThrow(/cell.*column/i);
  });

  it('does not mutate inputs and returns recursively frozen deterministic output', () => {
    const model = manualModel();
    const spec = { columnWidth: 90, rowHeight: 20 };
    const first = layoutTable(model, spec);
    const second = layoutTable(model, spec);

    expect(first).toEqual(second);
    expect(spec).toEqual({ columnWidth: 90, rowHeight: 20 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.bounds)).toBe(true);
    expect(Object.isFrozen(first.cells[0].box)).toBe(true);
  });
});
