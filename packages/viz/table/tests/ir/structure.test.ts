import { describe, expect, it } from 'vitest';

import { TableCellLocation, TableCellRole, TableRowKind, TableStructureKind, TableStructureSchema } from '../../src';

describe('Table structure schema', () => {
  it('exports stable built-in and reserved structure kinds', () => {
    expect(TableStructureKind).toEqual({
      Manual: 'manual',
      Detail: 'detail',
      Pivot: 'pivot',
      Matrix: 'matrix',
      Custom: 'custom',
    });
  });

  it('parses manual and detail operations through JSON round-trip', () => {
    const manual = {
      kind: 'manual',
      rows: 2,
      columns: 2,
      rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body],
      cells: [
        {
          address: { row: 0, column: 0 },
          payload: { kind: 'value', value: 'Name' },
          location: TableCellLocation.ColumnHeader,
          roles: [TableCellRole.ColumnHeader],
        },
      ],
    };
    const detail = {
      kind: 'detail',
      columns: [
        { id: 'name', field: 'user.name' },
        {
          id: 'score',
          field: 'score',
          header: { kind: 'value', value: 'Score' },
          presentation: { name: 'text' },
        },
      ],
    };

    expect(TableStructureSchema.parse(JSON.parse(JSON.stringify(manual)))).toEqual(manual);
    expect(TableStructureSchema.parse(JSON.parse(JSON.stringify(detail)))).toEqual(detail);
  });

  it('rejects invalid manual dimensions, addresses, and rowKinds length', () => {
    expect(() => TableStructureSchema.parse({ kind: 'manual', rows: 0, columns: 1, cells: [] })).toThrow();
    expect(() =>
      TableStructureSchema.parse({ kind: 'manual', rows: 2, columns: 1, rowKinds: ['body'], cells: [] }),
    ).toThrow(/rowKinds/i);
    expect(() =>
      TableStructureSchema.parse({
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [{ address: { row: -1, column: 0 }, payload: { kind: 'value', value: 1 } }],
      }),
    ).toThrow();
  });

  it('rejects duplicate detail column ids', () => {
    expect(() =>
      TableStructureSchema.parse({
        kind: 'detail',
        columns: [
          { id: 'value', field: 'a' },
          { id: 'value', field: 'b' },
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it('accepts JSON-safe custom operations and rejects reserved kinds', () => {
    expect(TableStructureSchema.parse({ kind: 'summaryByRegion', group: 'region' })).toEqual({
      kind: 'summaryByRegion',
      group: 'region',
    });
    for (const kind of ['manual', 'detail', 'pivot', 'matrix', 'custom']) {
      const operation = kind === 'manual' ? { kind } : kind === 'detail' ? { kind } : { kind, value: 1 };
      expect(() => TableStructureSchema.parse(operation)).toThrow();
    }
    expect(() => TableStructureSchema.parse({ kind: 'extension', build: () => [] })).toThrow();
  });
});
