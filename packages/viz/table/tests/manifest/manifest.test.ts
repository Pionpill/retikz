import { describe, expect, it } from 'vitest';

import type { IRTableSpec } from '../../src';

import {
  compileTable,
  TABLE_NAMESPACE,
  TableCellLocation,
  TableCellRole,
  TableComposite,
  TableLayoutManifestSchema,
} from '../../src';

/** 断言 JSON 风格对象图的每一层都已冻结 */
const expectDeepFrozen = (value: unknown): void => {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child);
};

describe('Table layout manifest', () => {
  it('publishes detached source and Table-local Cell bounds with semantic identity', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'people',
      data: { reference: 'people' },
      structure: {
        kind: 'detail',
        columns: [
          {
            id: 'name',
            field: 'name',
            headerLayout: { padding: 2 },
            bodyLayout: { padding: { x: 4, y: 3 }, overflow: 'clip' },
          },
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 90 },
        rowSize: { kind: 'fixed', value: 24 },
        headerRowSize: { kind: 'fixed', value: 30 },
        rowGap: 2,
      },
    };
    const result = compileTable(spec, { people: [{ name: 'Ada' }] }, { compile: { padding: 0 } });

    expect(TableLayoutManifestSchema.parse(result.manifest)).toEqual(result.manifest);
    expect(result.manifest).toMatchObject({
      tableId: 'people',
      allocationBounds: { x: 0, y: 0, width: 90, height: 56 },
      rows: [
        { id: 'row.header', index: 0, offset: 0, size: 30 },
        { id: 'row.0', index: 1, offset: 32, size: 24 },
      ],
      columns: [{ id: 'name', index: 0, offset: 0, size: 90 }],
      cells: [
        {
          cellId: 'cell.header.cname',
          rowId: 'row.header',
          columnId: 'name',
          rowIndex: 0,
          columnIndex: 0,
          span: { rows: 1, columns: 1 },
          box: { x: 0, y: 0, width: 90, height: 30 },
          contentBox: { x: 2, y: 2, width: 86, height: 26 },
          location: TableCellLocation.ColumnHeader,
          roles: [TableCellRole.ColumnHeader],
          source: { kind: 'generated', structureKind: 'detail' },
        },
        {
          cellId: 'cell.r0.cname',
          rowId: 'row.0',
          columnId: 'name',
          rowIndex: 1,
          columnIndex: 0,
          span: { rows: 1, columns: 1 },
          box: { x: 0, y: 32, width: 90, height: 24 },
          contentBox: { x: 4, y: 35, width: 82, height: 18 },
          location: TableCellLocation.Body,
          roles: [TableCellRole.Data],
          source: { kind: 'field', reference: 'people', sourceIndex: 0, field: 'name' },
        },
      ],
      borders: [],
    });
  });

  it('recursively freezes the artifact and remains deterministic without modifying input', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: [['Ada']],
      },
    };
    const before = structuredClone(spec);
    const first = compileTable(spec, {}, { compile: { padding: 0 } });
    const second = compileTable(spec, {}, { compile: { padding: 0 } });

    expectDeepFrozen(first.manifest);
    expect(() => {
      (first.manifest.allocationBounds as { width: number }).width = 999;
    }).toThrow();
    expect(() => {
      (first.manifest.cells[0].roles as Array<string>).push('mutated');
    }).toThrow();
    expect(first.manifest).toEqual(second.manifest);
    expect(spec).toEqual(before);
  });

  it('keeps canonical border geometry and per-atom provenance in the same manifest', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'grid',
      structure: {
        kind: 'manual',
        rows: [['x']],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 40 },
        rowSize: { kind: 'fixed', value: 20 },
        borders: { outer: { kind: 'line', stroke: '#f00', width: 2 } },
      },
    };
    const result = compileTable(spec, {}, { compile: { padding: 0 } });

    expect(result.manifest.borders).toHaveLength(4);
    expect(result.manifest.borders[0]).toMatchObject({
      pathId: expect.stringMatching(/^grid\/border\//),
      style: { stroke: '#f00', width: 2, lineCap: 'butt', lineJoin: 'miter' },
      atoms: [
        {
          key: expect.any(String),
          winner: { kind: 'line', source: { kind: 'default', scope: 'outer' } },
          contributors: [expect.objectContaining({ kind: 'line' })],
        },
      ],
    });
    expect(result.manifest.visualOverflowBounds.width).toBeGreaterThanOrEqual(42);
    expect(JSON.stringify(result.scene.primitives)).toContain('tableBorder');
  });
});
