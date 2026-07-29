import { describe, expect, it } from 'vitest';

import {
  ManualTableStructureSchema,
  TableCellLocation,
  TableCellRole,
  TableRowKind,
  TableStructureKind,
  TableStructureSchema,
} from '../../src';

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
      rows: [
        [
          'Name',
          {
            value: 'Score',
            presentation: { name: 'text' },
            location: TableCellLocation.ColumnHeader,
            roles: [TableCellRole.ColumnHeader],
          },
        ],
        [null, { content: { type: 'node', position: [0, 0], text: '95' } }],
        [{ value: null }, true],
      ],
      rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body, TableRowKind.Body],
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

  it('rejects empty, undefined, holey, and removed manual structures', () => {
    const holeyRow = Array<unknown>(1);

    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [[], []] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [[undefined]] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [holeyRow] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: 1, columns: 1, cells: [] })).toThrow();
    expect(() =>
      ManualTableStructureSchema.parse({
        kind: 'manual',
        rows: [[{ address: { row: 0, column: 0 }, payload: { kind: 'value', value: 1 } }]],
      }),
    ).toThrow();
  });

  it('rejects ragged rows and reports the offending row path', () => {
    const result = ManualTableStructureSchema.safeParse({
      kind: 'manual',
      rows: [['A'], ['B', 'C']],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['rows', 1] })]));
    }
  });

  it('rejects rowKinds whose length differs from rows at the rowKinds path', () => {
    const result = ManualTableStructureSchema.safeParse({
      kind: 'manual',
      rows: [['A'], ['B']],
      rowKinds: ['body'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['rowKinds'] })]));
    }
  });

  it('rejects mixed value/content objects and invalid direct children', () => {
    expect(() =>
      ManualTableStructureSchema.parse({ kind: 'manual', rows: [[{ value: 1, content: { type: 'group' } }]] }),
    ).toThrow();
    expect(() =>
      ManualTableStructureSchema.parse({
        kind: 'manual',
        rows: [[{ content: { type: 'group', children: [] }, presentation: { name: 'text' } }]],
      }),
    ).toThrow();
    expect(() =>
      ManualTableStructureSchema.parse({ kind: 'manual', rows: [[{ content: { type: 'unknown-child' } }]] }),
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
