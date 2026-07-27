import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRTableSpec } from '../../src';

import {
  compileTable,
  defineTableStructure,
  lowerTables,
  TABLE_NAMESPACE,
  TableComposite,
  TableLayoutManifestSchema,
} from '../../src';

const manualSpec = (id?: string): IRTableSpec => ({
  namespace: TABLE_NAMESPACE,
  type: TableComposite.Table,
  ...(id === undefined ? {} : { id }),
  structure: {
    kind: 'manual',
    rows: 1,
    columns: 1,
    cells: [{ address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Ada' } }],
  },
});

describe('Table layout-aware lowering', () => {
  it('registers a compile branch with the public manifest artifact schema', () => {
    const definition = lowerTables({})[0];

    expect(definition).toMatchObject({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      artifactSchema: TableLayoutManifestSchema,
    });
    expect(definition.compile).toBeTypeOf('function');
    expect('expand' in definition).toBe(false);
  });

  it('compiles one canonical root and returns its exact typed artifact value', () => {
    const result = compileTable(manualSpec('people'), {}, { compile: { padding: 0 } });
    const tableArtifacts = result.artifacts.filter(artifact => artifact.kind === 'composite');

    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 120, height: 32 });
    expect(tableArtifacts).toHaveLength(1);
    expect(tableArtifacts[0]).toMatchObject({
      kind: 'composite',
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
    expect(result.manifest).toBe(tableArtifacts[0]?.value);
    expect(result.manifest).toMatchObject({
      tableId: 'people',
      allocationBounds: { x: 0, y: 0, width: 120, height: 32 },
      rows: [{ id: 'row.0', index: 0, offset: 0, size: 32 }],
      columns: [{ id: 'column.0', index: 0, offset: 0, size: 120 }],
      cells: [{ cellId: 'cell.r0.c0', rowId: 'row.0', columnId: 'column.0' }],
    });
  });

  it('uses extra composite definitions in the same Core environment', () => {
    const BadgeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema: BadgeSchema,
      expand: node => ({ type: 'node' as const, position: [0, 0] as [number, number], text: node.label }),
    });
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            address: { row: 0, column: 0 },
            payload: { kind: 'content', content: { namespace: 'fixture', type: 'badge', label: 'Nested' } },
          },
        ],
      },
    };

    const result = compileTable(spec, {}, { compile: { composites: [badge], padding: 0 } });

    expect(JSON.stringify(result.scene.primitives)).toContain('Nested');
    expect(result.manifest.cells).toHaveLength(1);
  });

  it('keeps empty fixed tracks observable through the allocation sentinel', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'manual', rows: 2, columns: 3, cells: [] },
      layout: {
        columnSize: { kind: 'fixed', value: 100 },
        rowSize: { kind: 'fixed', value: 30 },
        columnGap: 5,
        rowGap: 3,
      },
    };
    const result = compileTable(spec, {}, { compile: { padding: 0 } });

    expect(result.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 310, height: 63 });
    expect(result.manifest.visualOverflowBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 310, height: 63 });
  });

  it('fails loud for missing data, custom structure, and duplicate composite keys', () => {
    const detail: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      data: { reference: 'missing' },
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
    };
    const custom: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'unknownStructure' },
    };
    const dataRequired = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('requiresData') }),
      build: (_spec, context) => {
        if (context.data === undefined) throw new Error('external data is required');
        return { rows: [], columns: [], cells: [] };
      },
    });
    const requiresData: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'requiresData' },
    };

    expect(() => compileTable(detail, {})).toThrow(/dataset.*missing/i);
    expect(() => compileTable(custom, {})).toThrow(/structure.*unknownStructure/i);
    expect(() => compileTable(requiresData, {}, { lower: { structureDefinitions: [dataRequired] } })).toThrow(
      /requiresData.*external data is required/i,
    );
    expect(() => compileTable(manualSpec(), {}, { compile: { composites: lowerTables({}) } })).toThrow(
      /duplicate composite (definition|registration)/i,
    );
  });
});
