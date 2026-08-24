import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { IRTableStructureOperation, TableStructureOutput } from '../../src';

import { defineTableStructure, TableCellLocation, TableCellRole, TableRowKind } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';

const validOutput = (): TableStructureOutput => ({
  rows: [{ id: 'row.0', kind: TableRowKind.Body }],
  columns: [{ id: 'column.0' }],
  cells: [
    {
      id: 'cell.0',
      row: 0,
      column: 0,
      payload: { kind: 'value', value: 'ok' },
      location: TableCellLocation.Body,
      roles: [TableCellRole.Data],
      source: { kind: 'generated', structureKind: 'extension' },
    },
  ],
});

const definitionOf = (kind: string, output: TableStructureOutput) =>
  defineTableStructure({
    schema: strictObject({ kind: literal(kind) }),
    build: () =>
      kind === 'extension'
        ? output
        : {
            ...output,
            cells: output.cells.map(cell =>
              cell.source?.kind === 'generated' && cell.source.structureKind === 'extension'
                ? { ...cell, source: { ...cell.source, structureKind: kind } }
                : cell,
            ),
          },
  });

const normalizeCustom = (
  kind: string,
  output: TableStructureOutput,
  options: Parameters<typeof normalizeTableStructure>[1] = {},
) => normalizeTableStructure({ kind }, { ...options, structureDefinitions: [definitionOf(kind, output)] });

const illegalSourceCases: Array<
  readonly [string, TableStructureOutput, Parameters<typeof normalizeTableStructure>[1], RegExp]
> = [
  [
    'manual-source',
    {
      ...validOutput(),
      cells: [{ ...validOutput().cells[0], source: { kind: 'manual', row: 0, column: 0 } }],
    },
    {},
    /manual source outside manual/i,
  ],
  [
    'field-header-source',
    {
      ...validOutput(),
      rows: [{ id: 'row.header', kind: TableRowKind.ColumnHeader }],
      cells: [
        {
          ...validOutput().cells[0],
          location: TableCellLocation.ColumnHeader,
          roles: [TableCellRole.ColumnHeader],
          source: { kind: 'field', reference: 'sales', sourceIndex: 0, field: 'value' },
        },
      ],
    },
    { data: { reference: 'sales' }, datasets: { sales: [{ value: 1 }] } },
    /field source must be a body/i,
  ],
  [
    'generated-source',
    {
      ...validOutput(),
      cells: [
        {
          ...validOutput().cells[0],
          source: { kind: 'generated', structureKind: 'another-structure' },
        },
      ],
    },
    {},
    /generated source must match/i,
  ],
];

describe('custom Table structure runtime guard', () => {
  it.each([
    [
      'duplicate-row',
      {
        ...validOutput(),
        rows: [
          { id: 'same', kind: TableRowKind.Body },
          { id: 'same', kind: TableRowKind.Body },
        ],
      },
      /duplicate row/i,
    ],
    [
      'duplicate-column',
      {
        ...validOutput(),
        columns: [{ id: 'same' }, { id: 'same' }],
      },
      /duplicate column/i,
    ],
    [
      'duplicate-cell',
      {
        ...validOutput(),
        columns: [{ id: 'column.0' }, { id: 'column.1' }],
        cells: [
          { ...validOutput().cells[0], id: 'same' },
          { ...validOutput().cells[0], id: 'same', column: 1 },
        ],
      },
      /duplicate cell/i,
    ],
  ] as const)('rejects %s owner identity collisions', (kind, output, message) => {
    expect(() => normalizeCustom(kind, output)).toThrow(message);
  });

  it('rejects location and roles that disagree with the containing row kind', () => {
    const output: TableStructureOutput = {
      ...validOutput(),
      rows: [{ id: 'row.header', kind: TableRowKind.ColumnHeader }],
      cells: [
        {
          ...validOutput().cells[0],
          location: TableCellLocation.Body,
          roles: [TableCellRole.Data],
          source: { kind: 'generated', structureKind: 'semantic-mismatch' },
        },
      ],
    };

    expect(() => normalizeCustom('semantic-mismatch', output)).toThrow(/location\/roles/i);
  });

  it.each(illegalSourceCases)('rejects the illegal %s matrix', (kind, output, options, message) => {
    expect(() => normalizeCustom(kind, output, options)).toThrow(message);
  });

  it('rejects a definition field transform that emits a non-JSON value', () => {
    const schema = strictObject({
      kind: literal('non-json-transform'),
      option: string().transform(() => () => 'not-json'),
    }) as unknown as ZodType<IRTableStructureOperation>;
    const definition = defineTableStructure({
      schema,
      build: () => validOutput(),
    });

    expect(() =>
      normalizeTableStructure({ kind: 'non-json-transform', option: 'input' }, { structureDefinitions: [definition] }),
    ).toThrow(/table: structure "non-json-transform"/);
  });

  it('detaches and freezes provider output, payload, and source aliases', () => {
    const payload = { kind: 'value' as const, value: 'before' };
    const source = { kind: 'generated' as const, structureKind: 'extension' };
    const mutableOutput = {
      rows: [{ id: 'row.0', kind: TableRowKind.Body }],
      columns: [{ id: 'column.0' }],
      cells: [
        {
          id: 'cell.0',
          row: 0,
          column: 0,
          payload,
          location: TableCellLocation.Body,
          roles: [TableCellRole.Data],
          source,
        },
      ],
    };
    const model = normalizeCustom('extension', mutableOutput);

    payload.value = 'after';
    source.structureKind = 'mutated';
    mutableOutput.rows[0].id = 'mutated';

    expect(model.rows[0].id).toBe('row.0');
    expect(model.cells[0].payload).toEqual({ kind: 'value', value: 'before' });
    expect(model.cells[0].source).toEqual({ kind: 'generated', structureKind: 'extension' });
    expect(model.cells[0].payload).not.toBe(payload);
    expect(model.cells[0].source).not.toBe(source);
    expect(Object.isFrozen(model.cells[0].payload)).toBe(true);
    expect(Object.isFrozen(model.cells[0].source)).toBe(true);
  });
});
