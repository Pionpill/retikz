import type { LayoutCompositeCompileContext, NodeLayoutCompileArtifact } from '@retikz/core';

import { compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRTableSpec, TableCompileArtifact } from '../../src';

import { compileTable, lowerTables, TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '../../src';
import { resolveTableTransaction } from '../../src/pipeline/layout';

const tableArtifactsOf = (artifacts: ReturnType<typeof compileTable>['artifacts']): Array<TableCompileArtifact> =>
  artifacts.filter(
    (artifact): artifact is TableCompileArtifact =>
      artifact.kind === 'composite' && artifact.namespace === TABLE_NAMESPACE && artifact.type === TableComposite.Table,
  );

/** 收集错误及其 cause 链，验证 transaction 包装没有丢失根错误 */
const errorChainOf = (error: unknown): Array<Error> => {
  const chain: Array<Error> = [];
  let current = error;
  while (current instanceof Error) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
};

describe('Table layout transaction', () => {
  it('solves span-aware tracks and publishes complete Cell boxes in canonical order', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 3,
        cells: [
          {
            id: 'wide',
            address: { row: 0, column: 0 },
            span: { columns: 2 },
            layout: { padding: { x: 2, y: 1 } },
            payload: { kind: 'value', value: 'wide' },
          },
          {
            id: 'last',
            address: { row: 0, column: 2 },
            payload: { kind: 'value', value: 'last' },
          },
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 20 },
        rowSize: { kind: 'fixed', value: 12 },
        columnGap: 2,
      },
    };
    const result = compileTable(spec, {}, { compile: { padding: 0 } });

    expect(result.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 64, height: 12 });
    expect(result.manifest.columns.map(column => [column.offset, column.size])).toEqual([
      [0, 20],
      [22, 20],
      [44, 20],
    ]);
    expect(result.manifest.cells.map(cell => [cell.cellId, cell.box, cell.contentBox])).toEqual([
      ['wide', { x: 0, y: 0, width: 42, height: 12 }, { x: 2, y: 1, width: 38, height: 10 }],
      ['last', { x: 44, y: 0, width: 20, height: 12 }, { x: 44, y: 0, width: 20, height: 12 }],
    ]);
  });

  it('applies replay-local scale before Table-local translation and keeps clip outside the transform', () => {
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
            layout: { padding: 5, fit: 'contain', overflow: 'clip' },
            payload: {
              kind: 'content',
              content: {
                type: 'node',
                id: 'probe-node',
                position: [10, 5],
                shape: 'rectangle',
                minimumSize: { width: 100, height: 20 },
                padding: 0,
              },
            },
          },
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 60 },
        rowSize: { kind: 'fixed', value: 50 },
      },
    };
    const result = compileTable(spec, {}, { compile: { padding: 0, artifacts: { nodeLayouts: true } } });
    const cell = result.manifest.cells[0];
    const nodeArtifact = result.artifacts.find(
      (artifact): artifact is NodeLayoutCompileArtifact =>
        artifact.kind === 'nodeLayout' && artifact.value.id === 'probe-node',
    );

    expect(cell.sourceAllocationBounds).toEqual({ x: -40, y: -5, width: 100, height: 20 });
    expect(cell.contentBox).toEqual({ x: 5, y: 5, width: 50, height: 40 });
    expect(cell.contentAllocationBounds).toEqual({ x: 5, y: 20, width: 50, height: 10 });
    expect(cell.visualOverflowBounds).toEqual({ x: 5, y: 19.75, width: 50, height: 10.5 });
    expect(nodeArtifact?.value.rect).toMatchObject({ x: 30, y: 25, width: 50, height: 10 });
  });

  it('uses constrained layout as the selected wrap replay and publishes its nested artifact once', () => {
    const calls: Array<{ kind: string; maxWidth?: number }> = [];
    const ProbeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('probe'),
    });
    const ProbeArtifactSchema = z.strictObject({ kind: z.enum(['intrinsic', 'constrained']), maxWidth: z.number() });
    const probe = defineComposite({
      namespace: 'fixture',
      type: 'probe',
      schema: ProbeSchema,
      artifactSchema: ProbeArtifactSchema,
      compile: (_node, context) => {
        const maxWidth =
          context.constraint.kind === 'constrained' && context.constraint.width?.kind === 'bounded'
            ? context.constraint.width.max
            : 100;
        calls.push({
          kind: context.constraint.kind,
          ...(context.constraint.kind === 'constrained' ? { maxWidth } : {}),
        });
        return {
          children: [
            {
              type: 'node',
              id: 'wrapped-node',
              position: [0, 0],
              shape: 'rectangle',
              minimumSize: { width: maxWidth, height: context.constraint.kind === 'constrained' ? 40 : 20 },
              padding: 0,
            },
          ],
          artifact: { kind: context.constraint.kind, maxWidth },
        };
      },
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
            layout: { padding: 5, wrap: true },
            payload: { kind: 'content', content: { namespace: 'fixture', type: 'probe' } },
          },
        ],
      },
      layout: { columnSize: { kind: 'fixed', value: 60 }, rowSize: { kind: 'auto' } },
    };
    const result = compileTable(spec, {}, { compile: { composites: [probe], padding: 0 } });
    const probeArtifacts = result.artifacts.filter(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'fixture',
    );

    expect(calls).toEqual([{ kind: 'intrinsic' }, { kind: 'constrained', maxWidth: 50 }]);
    expect(probeArtifacts).toHaveLength(1);
    expect(probeArtifacts[0]?.value).toEqual({ kind: 'constrained', maxWidth: 50 });
    expect(result.manifest.rows[0].size).toBe(50);
    expect(result.manifest.cells[0].sourceAllocationBounds.height).toBe(40);
    expect(result.manifest.cells[0].contentAllocationBounds.height).toBe(40);
  });

  it.each([
    ['exact', { kind: 'exact', size: 60 }],
    ['bounded', { kind: 'bounded', max: 60 }],
  ] as const)('maps an explicit parent %s width into the column solver exactly once', (_kind, width) => {
    const OuterSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('outer'),
      table: TableSpecSchema,
    });
    const outer = defineComposite({
      namespace: 'fixture',
      type: 'outer',
      schema: OuterSchema,
      compile: (node, context) => {
        const table = context.layoutChild(node.table, {
          kind: 'constrained',
          width,
        });
        return { children: [context.replay(table)] };
      },
    });
    const nested: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'manual', rows: 1, columns: 2, cells: [] },
      layout: {
        columnSize: { kind: 'fraction' },
        rowSize: { kind: 'fixed', value: 10 },
        columnGap: 4,
      },
    };
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ namespace: 'fixture', type: 'outer', table: nested }],
      },
      { composites: [...lowerTables({}), outer], padding: 0 },
    );
    const tableArtifact = result.artifacts.find(
      (artifact): artifact is TableCompileArtifact => artifact.kind === 'composite',
    );

    expect(tableArtifact?.value.allocationBounds).toEqual({ x: 0, y: 0, width: 60, height: 10 });
    expect(tableArtifact?.value.columns.map(column => column.size)).toEqual([28, 28]);
  });

  it('keeps zero-size clipped Cell identity while omitting its selected replay', () => {
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            id: 'zero',
            address: { row: 0, column: 0 },
            layout: { overflow: 'clip' },
            payload: {
              kind: 'content',
              content: { type: 'node', id: 'discarded', position: [0, 0], minimumSize: 20, padding: 0 },
            },
          },
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 0 },
        rowSize: { kind: 'fixed', value: 0 },
      },
    };
    const result = compileTable(spec, {}, { compile: { padding: 0, artifacts: { nodeLayouts: true } } });

    expect(result.manifest.cells[0]).toMatchObject({
      cellId: 'zero',
      box: { x: 0, y: 0, width: 0, height: 0 },
      contentBox: { x: 0, y: 0, width: 0, height: 0 },
      visualOverflowBounds: { x: 0, y: 0, width: 0, height: 0 },
    });
    expect(result.manifest.visualOverflowBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(result.artifacts.some(artifact => artifact.kind === 'nodeLayout' && artifact.value.id === 'discarded')).toBe(
      false,
    );
  });

  it('selects the canonical root manifest when a nested Table reuses the same public id', () => {
    const nested: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'same',
      structure: { kind: 'manual', rows: 1, columns: 1, cells: [] },
      layout: {
        columnSize: { kind: 'fixed', value: 10 },
        rowSize: { kind: 'fixed', value: 8 },
      },
    };
    const root: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'same',
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            id: 'nested-cell',
            address: { row: 0, column: 0 },
            payload: { kind: 'content', content: nested },
          },
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 50 },
        rowSize: { kind: 'fixed', value: 30 },
      },
    };
    const result = compileTable(root, {}, { compile: { padding: 0 } });
    const artifacts = tableArtifactsOf(result.artifacts);

    expect(artifacts).toHaveLength(2);
    expect(artifacts.map(artifact => artifact.occurrence)).not.toEqual([
      artifacts[0].occurrence,
      artifacts[0].occurrence,
    ]);
    expect(result.manifest).toBe(
      artifacts.find(
        artifact => artifact.occurrence.sourcePath === 'children[0]' && artifact.occurrence.expansionPath.length === 0,
      )?.value,
    );
    expect(result.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 50, height: 30 });
    expect(result.manifest.cells[0].cellId).toBe('nested-cell');
  });

  it('associates intrinsic Cell layout failures with the Table and Cell while preserving the cause', () => {
    const rootCause = new Error('fixture intrinsic failure');
    const FailingSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('intrinsic-failure'),
    });
    const failing = defineComposite({
      namespace: 'fixture',
      type: 'intrinsic-failure',
      schema: FailingSchema,
      compile: () => {
        throw rootCause;
      },
    });
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            id: 'total',
            address: { row: 0, column: 0 },
            payload: { kind: 'content', content: { namespace: 'fixture', type: 'intrinsic-failure' } },
          },
        ],
      },
    };

    let thrown: unknown;
    try {
      compileTable(spec, {}, { compile: { composites: [failing] } });
    } catch (error) {
      thrown = error;
    }
    const chain = errorChainOf(thrown);

    expect(
      chain.some(
        error =>
          error.message.includes('intrinsic Cell layout') &&
          error.message.includes('table "orders"') &&
          error.message.includes('Cell "total"'),
      ),
    ).toBe(true);
    expect(chain).toContain(rootCause);
  });

  it('associates constrained Cell layout failures with the Table and Cell while preserving the cause', () => {
    const rootCause = new Error('fixture constrained failure');
    const FailingSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('constrained-failure'),
    });
    const failing = defineComposite({
      namespace: 'fixture',
      type: 'constrained-failure',
      schema: FailingSchema,
      compile: (_node, context) => {
        if (context.constraint.kind === 'constrained') throw rootCause;
        return {
          children: [
            {
              type: 'node',
              position: [0, 0],
              minimumSize: { width: 80, height: 20 },
              padding: 0,
            },
          ],
        };
      },
    });
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      structure: {
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            id: 'total',
            address: { row: 0, column: 0 },
            layout: { wrap: true },
            payload: { kind: 'content', content: { namespace: 'fixture', type: 'constrained-failure' } },
          },
        ],
      },
      layout: { columnSize: { kind: 'fixed', value: 40 } },
    };

    let thrown: unknown;
    try {
      compileTable(spec, {}, { compile: { composites: [failing] } });
    } catch (error) {
      thrown = error;
    }
    const chain = errorChainOf(thrown);

    expect(
      chain.some(
        error =>
          error.message.includes('constrained Cell layout') &&
          error.message.includes('table "orders"') &&
          error.message.includes('Cell "total"'),
      ),
    ).toBe(true);
    expect(chain).toContain(rootCause);
  });

  it('associates Border Scope layout failures with the Table while preserving the cause', () => {
    const rootCause = new Error('fixture border failure');
    const context: LayoutCompositeCompileContext = {
      constraint: { kind: 'intrinsic' },
      layoutChild: () => {
        throw rootCause;
      },
      replay: () => {
        throw new Error('unexpected replay');
      },
      scope: () => {
        throw new Error('unexpected scope');
      },
    };
    const spec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      structure: { kind: 'manual', rows: 1, columns: 1, cells: [] },
      layout: {
        columnSize: { kind: 'fixed', value: 40 },
        rowSize: { kind: 'fixed', value: 20 },
        borders: { outer: { kind: 'line' } },
      },
    };

    let thrown: unknown;
    try {
      resolveTableTransaction(spec, {}, {}, context);
    } catch (error) {
      thrown = error;
    }
    const chain = errorChainOf(thrown);

    expect(
      chain.some(error => error.message.includes('Border Scope layout') && error.message.includes('table "orders"')),
    ).toBe(true);
    expect(chain).toContain(rootCause);
  });
});
