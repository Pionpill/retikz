import type { IRChild, IRScope } from '@retikz/core';

import { ChildSchema, compileToScene, CompileWarningCode, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRTableSpec, PresentedTableModel } from '../../src';
import type { TableLayout } from '../../src/pipeline/layout';

import { defineTableStructure, lowerTables, lowerTableWithArtifacts, TABLE_NAMESPACE, TableComposite } from '../../src';
import { layoutTable } from '../../src/pipeline/layout';
import { emitTable } from '../../src/pipeline/lower';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { presentTable } from '../../src/pipeline/presentation';

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

const scopeOf = (child: IRChild): IRScope => {
  if ('namespace' in child || child.type !== 'scope') throw new Error('expected Core Scope');
  return child;
};

describe('Table lowering', () => {
  it('emits valid Core scopes with a bounds sentinel and translated Cell content', () => {
    const result = lowerTableWithArtifacts(manualSpec(), {});
    const root = scopeOf(result.node);
    const sentinel = root.children[0];
    const cell = scopeOf(root.children[1]);

    expect(ChildSchema.parse(result.node)).toEqual(result.node);
    expect(root.localNamespace).toBe(true);
    expect(sentinel).toMatchObject({
      type: 'node',
      position: [60, 16],
      shape: 'rectangle',
      minimumSize: { width: 120, height: 32 },
      padding: 0,
      fill: 'none',
      stroke: 'none',
      opacity: 0,
      meta: { role: 'tableBounds' },
    });
    expect(cell).toMatchObject({
      type: 'scope',
      transforms: [{ kind: 'translate', x: 60, y: 16 }],
      meta: { role: 'tableCell', cellId: 'cell.r0.c0', location: 'body' },
    });
    expect(cell.children[0]).toMatchObject({ type: 'node', position: [0, 0], text: 'Ada' });
  });

  it('maps a Table id and metadata to an outer Scope while retaining an inner local namespace', () => {
    const spec = { ...manualSpec('people'), meta: { source: 'fixture' } };
    const result = lowerTableWithArtifacts(spec, {});
    const outer = scopeOf(result.node);
    const inner = scopeOf(outer.children[0]);

    expect(outer).toMatchObject({ id: 'people', meta: { source: 'fixture' } });
    expect(outer.localNamespace).toBeUndefined();
    expect(inner.localNamespace).toBe(true);
    expect(result.manifest.tableId).toBe('people');
  });

  it('lowers detail values, null text, and source metadata from external datasets', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      data: { reference: 'people' },
      structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
    };
    const result = lowerTableWithArtifacts(spec, { people: [{ name: null }] });
    const inner = scopeOf(result.node);
    const bodyCell = scopeOf(inner.children[1]);

    expect(bodyCell.meta).toMatchObject({
      role: 'tableCell',
      cellId: 'cell.r0.cname',
      location: 'body',
      reference: 'people',
      sourceIndex: 0,
      field: 'name',
    });
    expect(bodyCell.children[0]).toMatchObject({ type: 'node', text: '' });
  });

  it('keeps composite and artifact entry points node-equivalent', () => {
    const spec = manualSpec('same');
    const artifact = lowerTableWithArtifacts(spec, {});
    const definition = lowerTables({})[0];

    expect(definition.namespace).toBe(TABLE_NAMESPACE);
    expect(definition.type).toBe(TableComposite.Table);
    expect(definition.expand(spec)).toEqual(artifact.node);
  });

  it('makes an empty fixed-track Table contribute its complete bounds to Core Scene layout', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'manual', rows: 2, columns: 3, cells: [] },
      layout: { columnWidth: 100, rowHeight: 30, columnGap: 5, rowGap: 3 },
    };
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerTables({}), padding: 0 },
    );

    expect(scene.layout).toEqual({ x: 0, y: 0, width: 310, height: 63 });
  });

  it('preserves nested composites for recursive Core lowering', () => {
    const BadgeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema: BadgeSchema,
      expand: node => ({ type: 'node', position: [0, 0], text: node.label }),
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
    const result = lowerTableWithArtifacts(spec, {});
    const warnings: Array<string> = [];

    expect(JSON.stringify(result.node)).toContain('"namespace":"fixture"');
    compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      {
        composites: lowerTables({}),
        padding: 0,
        onWarn: warning => warnings.push(warning.code),
      },
    );
    expect(warnings).toContain(CompileWarningCode.CompositeNotRegistered);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: [...lowerTables({}), badge], padding: 0 },
    );
    expect(JSON.stringify(scene.primitives)).toContain('Nested');
  });

  it('fails loud for missing runtime capabilities', () => {
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
    const presentation: IRTableSpec = {
      ...manualSpec(),
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            address: { row: 0, column: 0 },
            payload: { kind: 'value', value: 1, presentation: { name: 'unknownPresentation' } },
          },
        ],
      },
    };

    expect(() => lowerTableWithArtifacts(detail, {})).toThrow(/dataset.*missing/i);
    expect(() => lowerTableWithArtifacts(custom, {})).toThrow(/structure.*unknownStructure/i);
    expect(() => lowerTableWithArtifacts(presentation, {})).toThrow(/presentation.*unknownPresentation/i);
  });

  it('preserves the custom structure kind when a provider rejects missing data', () => {
    const dataRequired = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('requiresData') }),
      build: (_spec, context) => {
        if (context.data === undefined) throw new Error('external data is required');
        return { rows: [], columns: [], cells: [] };
      },
    });
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'requiresData' },
    };

    expect(() => lowerTableWithArtifacts(spec, {}, { structureDefinitions: [dataRequired] })).toThrow(
      /table: lower: table: structure "requiresData": external data is required/,
    );
  });

  it('rejects Presented/Layout cell alignment drift before emit', () => {
    const model = normalizeTableStructure(manualSpec().structure);
    const presented = presentTable(model);
    const layout = layoutTable(model);
    const missingPresentedCell: PresentedTableModel = { ...presented, cells: [] };
    const wrongLayoutCell: TableLayout = {
      ...layout,
      cells: [{ ...layout.cells[0], cellId: 'different' }],
    };

    expect(() => emitTable(missingPresentedCell, layout)).toThrow(/table: internal cell alignment/i);
    expect(() => emitTable(presented, wrongLayoutCell)).toThrow(/table: internal cell alignment/i);
  });
});
