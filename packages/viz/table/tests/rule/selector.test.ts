import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRTableCellSelector, SemanticTableCell } from '../../src';

import { defineTableStructure } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { matchesTableCellSelector, matchesTableValuePredicate } from '../../src/pipeline/rule';

const manualModel = () =>
  normalizeTableStructure({
    kind: 'manual',
    rowKinds: ['columnHeader', 'body'],
    rows: [
      [[{ id: 'span', value: 0, span: { columns: 2 } }][0], null],
      [
        { id: 'direct', content: { type: 'node', position: [0, 0], text: 'direct' } },
        { id: 'false-value', value: false },
      ],
    ],
  });

describe('Table Cell selector matching', () => {
  it('uses membership OR within fields and conjunction across canonical fields', () => {
    const span = manualModel().cells[0];

    expect(
      matchesTableCellSelector(span, {
        cellIds: ['missing', 'span'],
        rowIds: ['row.0'],
        columnIds: ['column.0'],
        rowIndices: [0, 2],
        columnIndices: [0],
        locations: ['columnHeader'],
        roles: { any: ['data', 'columnHeader'], all: ['columnHeader'] },
        sourceKinds: ['manual'],
        payloadKinds: ['value'],
      }),
    ).toBe(true);
    expect(matchesTableCellSelector(span, { cellIds: ['span'], rowIds: ['row.1'] })).toBe(false);
  });

  it('matches a spanning Cell only by its origin row and column', () => {
    const span = manualModel().cells[0];

    expect(matchesTableCellSelector(span, { columnIds: ['column.0'] })).toBe(true);
    expect(matchesTableCellSelector(span, { columnIndices: [0] })).toBe(true);
    expect(matchesTableCellSelector(span, { columnIds: ['column.1'] })).toBe(false);
    expect(matchesTableCellSelector(span, { columnIndices: [1] })).toBe(false);
  });

  it('matches fields only for canonical field sources', () => {
    const detail = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'score', field: 'score' }] },
      { data: { reference: 'sales' }, datasets: { sales: [{ score: 42 }] } },
    );
    const header = detail.cells[0];
    const body = detail.cells[1];

    expect(matchesTableCellSelector(header, { fields: ['score'] })).toBe(false);
    expect(matchesTableCellSelector(body, { fields: ['score'] })).toBe(true);
    expect(matchesTableCellSelector(body, { fields: ['missing'] })).toBe(false);
  });

  it('keeps content Cells outside a value predicate negate domain', () => {
    const cells = manualModel().cells;
    const direct = cells.find(cell => cell.id === 'direct') as SemanticTableCell;
    const falseValue = cells.find(cell => cell.id === 'false-value') as SemanticTableCell;

    expect(matchesTableCellSelector(direct, { payloadKinds: ['content'] })).toBe(true);
    expect(matchesTableCellSelector(falseValue, { payloadKinds: ['value'] })).toBe(true);
    expect(matchesTableCellSelector(direct, { value: { kind: 'equal', value: 0 }, negate: true })).toBe(false);
    expect(matchesTableCellSelector(falseValue, { value: { kind: 'null', isNull: false } })).toBe(true);
  });

  it('applies ordinary negate after all non-value conditions', () => {
    const cells = manualModel().cells;
    const span = cells.find(cell => cell.id === 'span') as SemanticTableCell;
    const direct = cells.find(cell => cell.id === 'direct') as SemanticTableCell;

    expect(matchesTableCellSelector(span, { cellIds: ['span'], negate: true })).toBe(false);
    expect(matchesTableCellSelector(direct, { cellIds: ['span'], negate: true })).toBe(true);
  });

  it('distinguishes roles any membership from roles all containment', () => {
    const span = manualModel().cells.find(cell => cell.id === 'span') as SemanticTableCell;

    expect(matchesTableCellSelector(span, { roles: { any: ['data', 'columnHeader'] } })).toBe(true);
    expect(matchesTableCellSelector(span, { roles: { any: ['data'] } })).toBe(false);
    expect(matchesTableCellSelector(span, { roles: { all: ['columnHeader'] } })).toBe(true);
    expect(matchesTableCellSelector(span, { roles: { all: ['columnHeader', 'data'] } })).toBe(false);
  });

  it('keeps selector semantics independent from the structure provider', () => {
    const custom = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('fixture-structure') }),
      build: () => ({
        rows: [{ id: 'row.0', kind: 'body' }],
        columns: [{ id: 'column.0' }],
        cells: [
          {
            id: 'cell.r0.c0',
            row: 0,
            column: 0,
            payload: { kind: 'value', value: 1 },
            location: 'body',
            roles: ['data'],
            source: { kind: 'generated', structureKind: 'fixture-structure' },
          },
        ],
      }),
    });
    const manual = normalizeTableStructure({ kind: 'manual', rows: [[1]] }).cells[0];
    const generated = normalizeTableStructure({ kind: 'fixture-structure' }, { structureDefinitions: [custom] })
      .cells[0];
    const selectors: Array<IRTableCellSelector> = [
      { cellIds: ['cell.r0.c0'] },
      { rowIds: ['row.0'], columnIds: ['column.0'] },
      { rowIndices: [0], columnIndices: [0], locations: ['body'] },
      { roles: { all: ['data'] }, payloadKinds: ['value'] },
      { value: { kind: 'equal', value: 1 } },
    ];

    expect(selectors.map(selector => matchesTableCellSelector(manual, selector))).toEqual(
      selectors.map(selector => matchesTableCellSelector(generated, selector)),
    );
  });
});

describe('Table raw value predicate matching', () => {
  it('uses strict JSON scalar equality and membership without coercion', () => {
    expect(matchesTableValuePredicate(1, { kind: 'equal', value: 1 })).toBe(true);
    expect(matchesTableValuePredicate('1', { kind: 'equal', value: 1 })).toBe(false);
    expect(matchesTableValuePredicate(false, { kind: 'oneOf', values: [0, false, null] })).toBe(true);
    expect(matchesTableValuePredicate('', { kind: 'oneOf', values: [false, 0] })).toBe(false);
  });

  it('compares only same-type strings or numbers with deterministic relational semantics', () => {
    expect(matchesTableValuePredicate(10, { kind: 'compare', operator: 'gt', value: 2 })).toBe(true);
    expect(matchesTableValuePredicate('10', { kind: 'compare', operator: 'gt', value: 2 })).toBe(false);
    expect(matchesTableValuePredicate('ä', { kind: 'compare', operator: 'gt', value: 'z' })).toBe(true);
    expect(matchesTableValuePredicate(true, { kind: 'compare', operator: 'gt', value: 0 })).toBe(false);
  });

  it('respects equal endpoints and every between inclusion boundary', () => {
    expect(matchesTableValuePredicate(2, { kind: 'between', min: 2, max: 2 })).toBe(true);
    expect(matchesTableValuePredicate(2, { kind: 'between', min: 2, max: 3, includeMin: false })).toBe(false);
    expect(matchesTableValuePredicate(3, { kind: 'between', min: 2, max: 3, includeMax: false })).toBe(false);
    expect(matchesTableValuePredicate('b', { kind: 'between', min: 'a', max: 'c' })).toBe(true);
    expect(matchesTableValuePredicate(2, { kind: 'between', min: '1', max: '3' })).toBe(false);
  });

  it('distinguishes null from every falsy non-null scalar', () => {
    expect(matchesTableValuePredicate(null, { kind: 'null' })).toBe(true);
    expect(matchesTableValuePredicate(null, { kind: 'null', isNull: false })).toBe(false);
    expect(matchesTableValuePredicate(false, { kind: 'null', isNull: false })).toBe(true);
    expect(matchesTableValuePredicate(0, { kind: 'null', isNull: false })).toBe(true);
    expect(matchesTableValuePredicate('', { kind: 'null', isNull: false })).toBe(true);
  });
});
