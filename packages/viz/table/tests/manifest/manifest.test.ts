import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRTableSpec } from '../../src';

import {
  defineCellPresentation,
  defineTableStructure,
  layoutTable,
  lowerTableWithArtifacts,
  normalizeTableStructure,
  TABLE_NAMESPACE,
  TableCellLocation,
  TableCellRole,
  TableComposite,
  TableRowKind,
} from '../../src';

/** 断言 JSON 风格对象图的每一层都已冻结 */
const expectDeepFrozen = (value: unknown): void => {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child);
};

describe('Table layout manifest', () => {
  it('detaches row, column, Cell, box, roles, and source data from the semantic/layout inputs', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'people',
      data: { reference: 'people' },
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
      layout: { columnWidth: 90, rowHeight: 24, headerHeight: 30, rowGap: 2 },
    };
    const datasets = { people: [{ name: 'Ada' }] };
    const model = normalizeTableStructure(spec.structure, { data: spec.data, datasets });
    const layout = layoutTable(model, spec.layout);
    const result = lowerTableWithArtifacts(spec, datasets);

    expect(result.manifest).toEqual({
      tableId: 'people',
      bounds: { x: 0, y: 0, width: 90, height: 56 },
      rows: [
        { id: 'row.header', index: 0, offset: 0, size: 30 },
        { id: 'row.0', index: 1, offset: 32, size: 24 },
      ],
      columns: [{ id: 'name', index: 0, offset: 0, size: 90 }],
      cells: [
        {
          cellId: 'cell.header.cname',
          box: { x: 0, y: 0, width: 90, height: 30 },
          location: TableCellLocation.ColumnHeader,
          roles: [TableCellRole.ColumnHeader],
          source: { kind: 'generated', structureKind: 'detail' },
        },
        {
          cellId: 'cell.r0.cname',
          box: { x: 0, y: 32, width: 90, height: 24 },
          location: TableCellLocation.Body,
          roles: [TableCellRole.Data],
          source: { kind: 'field', reference: 'people', sourceIndex: 0, field: 'name' },
        },
      ],
    });
    expect(result.manifest.bounds).not.toBe(layout.bounds);
    expect(result.manifest.rows[0]).not.toBe(layout.rows[0]);
    expect(result.manifest.columns[0]).not.toBe(layout.columns[0]);
    expect(result.manifest.cells[0].box).not.toBe(layout.cells[0].box);
    expect(result.manifest.cells[0].roles).not.toBe(model.cells[0].roles);
    expect(result.manifest.cells[0].source).not.toBe(model.cells[0].source);
  });

  it('recursively freezes the whole manifest and remains deterministic after failed mutation', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [{ address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Ada' } }],
      },
    };
    const first = lowerTableWithArtifacts(spec, {});
    const snapshot = JSON.parse(JSON.stringify(first)) as typeof first;
    if ('namespace' in first.node || first.node.type !== 'scope') throw new Error('expected Table root Scope');
    const sentinel = first.node.children[0];
    if (
      'namespace' in sentinel ||
      sentinel.type !== 'node' ||
      sentinel.minimumSize === undefined ||
      typeof sentinel.minimumSize === 'number'
    ) {
      throw new Error('expected Table bounds sentinel');
    }

    expectDeepFrozen(first.manifest);
    expect(sentinel.minimumSize).not.toBe(first.manifest.bounds);
    sentinel.minimumSize.width = 321;
    expect(first.manifest.bounds.width).toBe(120);
    expect(() => {
      (first.manifest.bounds as { width: number }).width = 999;
    }).toThrow();
    expect(() => {
      (first.manifest.cells[0].roles as Array<string>).push('mutated');
    }).toThrow();
    expect(first.manifest).toEqual(snapshot.manifest);
    expect(lowerTableWithArtifacts(spec, {})).toEqual(snapshot);
  });

  it('supports custom structure and presentation through the same lowering path without output aliasing', () => {
    const output = {
      rows: [{ id: 'row.summary', kind: TableRowKind.Body }],
      columns: [{ id: 'region' }],
      cells: [
        {
          id: 'cell.summary.region',
          row: 0,
          column: 0,
          payload: {
            kind: 'value' as const,
            value: 'East',
            presentation: { name: 'prefix', options: { prefix: 'Region: ' } },
          },
          location: TableCellLocation.Body,
          roles: [TableCellRole.Data],
          source: { kind: 'generated' as const, structureKind: 'summary' },
        },
      ],
    };
    const structure = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('summary') }),
      build: () => output,
    });
    const presentation = defineCellPresentation({
      name: 'prefix',
      optionsSchema: z.strictObject({ prefix: z.string() }),
      present: ({ value }, options) => ({
        type: 'node',
        position: [0, 0],
        text: `${options.prefix}${String(value)}`,
      }),
    });
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'summary' },
    };
    const result = lowerTableWithArtifacts(
      spec,
      {},
      {
        structureDefinitions: [structure],
        presentationDefinitions: [presentation],
      },
    );

    expect(JSON.stringify(result.node)).toContain('Region: East');
    expect(result.manifest.cells[0].source).toEqual({ kind: 'generated', structureKind: 'summary' });
    expect(result.manifest.rows[0]).not.toBe(output.rows[0]);
    expect(result.manifest.cells[0].roles).not.toBe(output.cells[0].roles);

    output.rows[0].id = 'mutated';
    output.cells[0].roles.push(TableCellRole.Data);
    expect(result.manifest.rows[0].id).toBe('row.summary');
    expect(result.manifest.cells[0].roles).toEqual([TableCellRole.Data]);
  });

  it('preserves zero-row and zero-column bounds without inventing positive sizes', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      data: { reference: 'empty' },
      structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
    };
    const result = lowerTableWithArtifacts(spec, { empty: [] });

    expect(result.manifest.bounds).toEqual({ x: 0, y: 0, width: 120, height: 0 });
    expect(result.manifest.rows).toEqual([]);
    expect(result.manifest.cells).toEqual([]);
    expect(JSON.stringify(result.node)).toContain('"minimumSize":{"width":120,"height":0}');

    const zeroColumns = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('zeroColumns') }),
      build: () => ({
        rows: [{ id: 'row.0', kind: TableRowKind.Body }],
        columns: [],
        cells: [],
      }),
    });
    const zeroColumnSpec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'zeroColumns' },
    };
    const zeroColumnResult = lowerTableWithArtifacts(zeroColumnSpec, {}, { structureDefinitions: [zeroColumns] });

    expect(zeroColumnResult.manifest.bounds).toEqual({ x: 0, y: 0, width: 0, height: 32 });
    expect(zeroColumnResult.manifest.columns).toEqual([]);
    expect(zeroColumnResult.manifest.cells).toEqual([]);
    expect(JSON.stringify(zeroColumnResult.node)).toContain('"minimumSize":{"width":0,"height":32}');
  });
});
