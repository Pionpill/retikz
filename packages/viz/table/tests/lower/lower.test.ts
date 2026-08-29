import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { IRTable } from '../../src';

import {
  compileTable,
  defineTableStructure,
  lowerTables,
  TABLE_NAMESPACE,
  TableComposite,
  TableLayoutManifestSchema,
} from '../../src';
import { CLEAN_TABLE_THEME_TOKENS } from '../fixtures/clean-theme-tokens';

const manualSpec = (id?: string): IRTable => ({
  namespace: TABLE_NAMESPACE,
  type: TableComposite.Table,
  ...(id === undefined ? {} : { id }),
  structure: {
    kind: 'manual',
    rows: [['Ada']],
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
      rows: [{ index: 0, offset: 0, size: 32 }],
      columns: [{ index: 0, offset: 0, size: 120 }],
      cells: [{ rowIndex: 0, columnIndex: 0 }],
    });
    expect(result.manifest.cells[0]).not.toHaveProperty('cellId');
    expect(result.manifest.cells[0]).not.toHaveProperty('rowId');
    expect(result.manifest.cells[0]).not.toHaveProperty('columnId');
  });

  it('uses extra composite definitions in the same Core environment', () => {
    const BadgeSchema = CompositeBaseSchema.extend({
      namespace: literal('fixture'),
      type: literal('badge'),
      label: string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema: BadgeSchema,
      expand: node => ({
        children: [{ type: 'node' as const, position: [0, 0] as [number, number], text: node.label }],
      }),
    });
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
      },
    };

    const result = compileTable(spec, {}, { compile: { composites: [badge], padding: 0 } });

    expect(JSON.stringify(result.scene.primitives)).toContain('Nested');
    expect(result.manifest.cells).toHaveLength(1);
  });

  it('keeps empty fixed tracks observable through the allocation sentinel', () => {
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [
          [null, null, null],
          [null, null, null],
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 100 },
        rowSize: { kind: 'fixed', value: 30 },
        columnGap: 5,
        rowGap: 3,
      },
    };
    const result = compileTable(spec, {}, { theme: { mode: 'light' }, compile: { padding: 0 } });

    expect(result.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 310, height: 63 });
    expect(result.manifest.visualOverflowBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 310, height: 63 });
  });

  it.each([
    ['light', '#d6e0eb', '#d6adad', '#c28585'],
    ['dark', '#0a141f', '#3d1414', '#5c1f1f'],
  ] as const)(
    'resolves Cell and Header contextual colors from their own content masters in %s mode',
    (mode, cellBackground, headerBackground, headerBorder) => {
      const spec: IRTable = {
        namespace: TABLE_NAMESPACE,
        type: TableComposite.Table,
        data: { reference: 'people' },
        structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
        tableThemeTokens: {
          'cell.content.color': '#336699',
          'cell.background.fill': 0.2,
          'columnHeader.content.color': '#993333',
          'columnHeader.background.fill': 0.4,
          'columnHeader.border.bottom': { kind: 'line', stroke: 0.6, width: 2 },
        },
      };
      const result = compileTable(spec, { people: [{ name: 'Ada' }] }, { theme: { mode }, compile: { padding: 0 } });
      const headerWinner = result.manifest.borders
        .flatMap(border => border.atoms)
        .map(atom => atom.winner)
        .find(winner => winner.kind === 'line' && winner.source.kind === 'cell' && winner.source.side === 'bottom');

      expect(result.manifest.cells[0].appearance).toMatchObject({
        background: { fill: 0.4 },
        content: { color: '#993333' },
      });
      expect(result.manifest.cells[1].appearance).toMatchObject({
        background: { fill: 0.2 },
        content: { color: '#336699' },
      });
      expect(headerWinner).toMatchObject({
        kind: 'line',
        line: { color: '#993333', stroke: 0.6 },
      });
      const serialized = JSON.stringify(result.scene);
      expect(serialized).toContain(cellBackground);
      expect(serialized).toContain(headerBackground);
      expect(serialized).toContain(headerBorder);
      expect(serialized).not.toMatch(/"(?:fill|stroke)":0(?:\.\d+)?/);
    },
  );

  it('fails loud for missing data, custom structure, and duplicate composite keys', () => {
    const detail: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      data: { reference: 'missing' },
      structure: { kind: 'detail', columns: [{ id: 'name', field: 'name' }] },
    };
    const custom: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'unknownStructure' },
    };
    const dataRequired = defineTableStructure({
      schema: strictObject({ kind: literal('requiresData') }),
      build: (_spec, context) => {
        if (context.data === undefined) throw new Error('external data is required');
        return { rows: [], columns: [], cells: [] };
      },
    });
    const requiresData: IRTable = {
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
