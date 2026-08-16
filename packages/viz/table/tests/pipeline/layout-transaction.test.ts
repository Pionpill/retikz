import type { LayoutCompositeCompileContext, NodeLayoutCompileArtifact } from '@retikz/core';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRTable, TableCompileArtifact } from '../../src';

import { compileTable, lowerTables, TABLE_NAMESPACE, TableComposite, TableSchema } from '../../src';
import { resolveTableTransaction } from '../../src/pipeline/layout';
import { CLEAN_TABLE_THEME_TOKENS } from '../fixtures/clean-theme-tokens';

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
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [
          [
            {
              id: 'wide',
              value: 'wide',
              span: { columns: 2 },
              layout: { padding: { x: 2, y: 1 } },
            },
            null,
            { id: 'last', value: 'last' },
          ],
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 20 },
        rowSize: { kind: 'fixed', value: 12 },
        columnGap: 2,
      },
    };
    const result = compileTable(spec, {}, { theme: { mode: 'light' }, compile: { padding: 0 } });

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
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [
          [
            {
              layout: { padding: 5, fit: 'contain', overflow: 'clip' },
              content: {
                type: 'node',
                id: 'probe-node',
                position: [10, 5],
                shape: 'rectangle',
                minimumSize: { width: 100, height: 20 },
                padding: 0,
              },
            },
          ],
        ],
      },
      layout: {
        columnSize: { kind: 'fixed', value: 60 },
        rowSize: { kind: 'fixed', value: 50 },
      },
    };
    const result = compileTable(
      spec,
      {},
      {
        theme: { mode: 'light' },
        compile: { padding: 0, artifacts: { nodeLayouts: true } },
      },
    );
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

  it('uses a full finite range proposal as the selected wrap replay and publishes its nested artifact once', () => {
    const calls: Array<LayoutCompositeCompileContext['proposal']> = [];
    const ProbeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('probe'),
    });
    const ProbeArtifactSchema = z.strictObject({ mode: z.enum(['natural', 'range']), maxWidth: z.number() });
    const probe = defineComposite({
      namespace: 'fixture',
      type: 'probe',
      schema: ProbeSchema,
      artifactSchema: ProbeArtifactSchema,
      compile: (_node, context) => {
        const maxWidth =
          context.proposal.x.kind === LayoutAxisProposalKind.Range && context.proposal.x.max !== undefined
            ? context.proposal.x.max
            : 100;
        calls.push(context.proposal);
        const mode = context.proposal.x.kind === LayoutAxisProposalKind.Range ? 'range' : 'natural';
        return {
          children: [
            {
              type: 'node',
              id: 'wrapped-node',
              position: [0, 0],
              shape: 'rectangle',
              minimumSize: { width: maxWidth, height: mode === 'range' ? 40 : 20 },
              padding: 0,
            },
          ],
          artifact: { mode, maxWidth },
        };
      },
    });
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [
          [
            {
              layout: { padding: 5, wrap: true },
              content: { namespace: 'fixture', type: 'probe' },
            },
          ],
        ],
      },
      layout: { columnSize: { kind: 'fixed', value: 60 }, rowSize: { kind: 'auto' } },
    };
    const result = compileTable(
      spec,
      {},
      {
        theme: { mode: 'light' },
        compile: { composites: [probe], padding: 0 },
      },
    );
    const probeArtifacts = result.artifacts.filter(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'fixture',
    );

    expect(calls).toEqual([
      NaturalLayoutProposal,
      {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 50 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    ]);
    expect(probeArtifacts).toHaveLength(1);
    expect(probeArtifacts[0]?.value).toEqual({ mode: 'range', maxWidth: 50 });
    expect(result.manifest.rows[0].size).toBe(50);
    expect(result.manifest.cells[0].sourceAllocationBounds.height).toBe(40);
    expect(result.manifest.cells[0].contentAllocationBounds.height).toBe(40);
  });

  it.each([
    ['exact', { kind: LayoutAxisProposalKind.Exact, value: 60 }],
    ['finite range', { kind: LayoutAxisProposalKind.Range, min: 10, max: 60 }],
  ] as const)('maps an explicit parent %s width into the column solver exactly once', (_kind, x) => {
    const OuterSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('outer'),
      table: TableSchema,
    });
    const outer = defineComposite({
      namespace: 'fixture',
      type: 'outer',
      schema: OuterSchema,
      compile: (node, context) => {
        const tableProbe = context.layoutChild(node.table, {
          x,
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        if (tableProbe.kind === LayoutChildProbeKind.Failed) return context.raise(tableProbe.failure);
        return { children: [context.replay(tableProbe.result)] };
      },
    });
    const nested: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'manual', rows: [[null, null]] },
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

  it.each([
    ['minimum', { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum }, 20],
    ['natural', { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural }, 20],
    ['unbounded range', { kind: LayoutAxisProposalKind.Range, min: 0 }, 20],
    ['explicit exact zero', { kind: LayoutAxisProposalKind.Exact, value: 0 }, 0],
  ] as const)('maps parent %s without inventing or dropping a column limit', (_kind, x, expectedWidth) => {
    const OuterSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('limit-observer'),
      table: TableSchema,
    });
    const outer = defineComposite({
      namespace: 'fixture',
      type: 'limit-observer',
      schema: OuterSchema,
      compile: (node, context) => {
        const tableProbe = context.layoutChild(node.table, {
          x,
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        if (tableProbe.kind === LayoutChildProbeKind.Failed) return context.raise(tableProbe.failure);
        return { children: [context.replay(tableProbe.result)] };
      },
    });
    const nested: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: [[{ content: { type: 'node', position: [0, 0], minimumSize: 20, padding: 0 } }]],
      },
      layout: {
        columnSize: { kind: 'fraction' },
        rowSize: { kind: 'fixed', value: 10 },
      },
    };
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ namespace: 'fixture', type: 'limit-observer', table: nested }],
      },
      { composites: [...lowerTables({}), outer], padding: 0 },
    );
    const tableArtifact = result.artifacts.find(
      (artifact): artifact is TableCompileArtifact => artifact.kind === 'composite',
    );

    expect(tableArtifact?.value.allocationBounds.width).toBe(expectedWidth);
  });

  it('keeps zero-size clipped Cell identity while omitting its selected replay', () => {
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: [
          [
            {
              id: 'zero',
              layout: { overflow: 'clip' },
              content: { type: 'node', id: 'discarded', position: [0, 0], minimumSize: 20, padding: 0 },
            },
          ],
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
    const nested: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'same',
      structure: { kind: 'manual', rows: [[null]] },
      layout: {
        columnSize: { kind: 'fixed', value: 10 },
        rowSize: { kind: 'fixed', value: 8 },
      },
    };
    const root: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'same',
      structure: {
        kind: 'manual',
        rows: [[{ id: 'nested-cell', content: nested }]],
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

  it('keeps a fatal nested Cell contract error fatal when an ancestor discards the Table probe', () => {
    const malformed = defineComposite({
      namespace: 'fixture',
      type: 'malformed-cell-output',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('malformed-cell-output'),
      }),
      compile: () => ({ children: [{ type: 'bogus' } as never] }),
    });
    const OuterSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('discard-table-probe'),
      table: TableSchema,
    });
    const outer = defineComposite({
      namespace: 'fixture',
      type: 'discard-table-probe',
      schema: OuterSchema,
      compile: (node, context) => {
        context.layoutChild(node.table, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const table: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: {
        kind: 'manual',
        rows: [[{ content: { namespace: 'fixture', type: 'malformed-cell-output' } }]],
      },
    };

    expect(() =>
      compileToScene(
        {
          version: 1,
          type: 'scene',
          children: [{ namespace: 'fixture', type: 'discard-table-probe', table }],
        },
        { composites: [malformed, ...lowerTables({}), outer] },
      ),
    ).toThrow(/malformed-cell-output.*invalid output child.*index 0/i);
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
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [[{ id: 'total', content: { namespace: 'fixture', type: 'intrinsic-failure' } }]],
      },
    };

    let thrown: unknown;
    try {
      compileTable(spec, {}, { theme: { mode: 'light' }, compile: { composites: [failing] } });
    } catch (error) {
      thrown = error;
    }
    const chain = errorChainOf(thrown);
    const message = thrown instanceof Error ? thrown.message : '';

    expect(
      chain.some(
        error =>
          error.message.includes('intrinsic Cell layout') &&
          error.message.includes('table "orders"') &&
          error.message.includes('Cell "total"'),
      ),
    ).toBe(true);
    expect(chain).toContain(rootCause);
    expect(chain.some(error => error.message.includes('children[0]'))).toBe(true);
    expect(message.match(/Layout child provider/g)).toHaveLength(1);
    expect(message).toContain("Layout child provider 'fixture.intrinsic-failure'");
    expect(message).not.toContain("Layout child provider 'table.table'");
  });

  it('keeps one leaf failure envelope when an outer solver raises a failed Table probe', () => {
    const rootCause = new Error('fixture nested Table failure');
    const failing = defineComposite({
      namespace: 'fixture',
      type: 'nested-table-failure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('nested-table-failure'),
      }),
      compile: () => {
        throw rootCause;
      },
    });
    const table: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [[{ id: 'total', content: { namespace: 'fixture', type: 'nested-table-failure' } }]],
      },
    };
    const outer = defineComposite({
      namespace: 'fixture',
      type: 'nested-table-failure-outer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('nested-table-failure-outer'),
        table: TableSchema,
      }),
      compile: (node, context) => {
        const probe = context.layoutChild(node.table, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });

    let thrown: unknown;
    try {
      compileToScene(
        {
          version: 1,
          type: 'scene',
          children: [{ namespace: 'fixture', type: 'nested-table-failure-outer', table }],
        },
        { composites: [failing, ...lowerTables({}), outer] },
      );
    } catch (error) {
      thrown = error;
    }
    const message = thrown instanceof Error ? thrown.message : '';

    expect(message.match(/Layout child provider/g)).toHaveLength(1);
    expect(message).toContain("Layout child provider 'fixture.nested-table-failure'");
    expect(message).not.toContain("Layout child provider 'table.table'");
    expect(errorChainOf(thrown)).toContain(rootCause);
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
        if (context.proposal.x.kind === LayoutAxisProposalKind.Range) throw rootCause;
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
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      tableThemeTokens: CLEAN_TABLE_THEME_TOKENS,
      structure: {
        kind: 'manual',
        rows: [
          [{ id: 'total', layout: { wrap: true }, content: { namespace: 'fixture', type: 'constrained-failure' } }],
        ],
      },
      layout: { columnSize: { kind: 'fixed', value: 40 } },
    };

    let thrown: unknown;
    try {
      compileTable(spec, {}, { theme: { mode: 'light' }, compile: { composites: [failing] } });
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
    expect(chain.some(error => error.message.includes('children[0]'))).toBe(true);
  });

  it('associates Border Scope layout failures with the Table while preserving the cause', () => {
    const rootCause = new Error('fixture border failure');
    const spec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'orders',
      structure: { kind: 'manual', rows: [[null]] },
      layout: {
        columnSize: { kind: 'fixed', value: 40 },
        rowSize: { kind: 'fixed', value: 20 },
        borders: { outer: { kind: 'line' } },
      },
    };
    const failing = defineComposite({
      namespace: 'fixture',
      type: 'border-failure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('border-failure'),
      }),
      compile: () => {
        throw rootCause;
      },
    });
    let borderLayoutCalls = 0;
    let raisedFailure: unknown;
    let expectedFailure: unknown;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'border-harness',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('border-harness'),
      }),
      compile: (_node, context) => {
        const failedProbe = context.layoutChild(
          { namespace: 'fixture', type: 'border-failure' },
          NaturalLayoutProposal,
        );
        if (failedProbe.kind === LayoutChildProbeKind.Resolved) {
          throw new Error('expected a real failed Border fixture probe');
        }
        expectedFailure = failedProbe.failure;
        const tableContext: LayoutCompositeCompileContext = {
          ...context,
          layoutChild: (_child, proposal) => {
            borderLayoutCalls += 1;
            expect(proposal).toEqual(NaturalLayoutProposal);
            return failedProbe;
          },
          raise: failure => {
            raisedFailure = failure;
            return context.raise(failure);
          },
        };
        resolveTableTransaction(spec, {}, {}, tableContext);
        return { children: [] };
      },
    });

    let thrown: unknown;
    try {
      compileToScene(
        {
          version: 1,
          type: 'scene',
          children: [{ namespace: 'fixture', type: 'border-harness' }],
        },
        { composites: [failing, harness] },
      );
    } catch (error) {
      thrown = error;
    }
    const chain = errorChainOf(thrown);

    expect(
      chain.some(error => error.message.includes('Border Scope layout') && error.message.includes('table "orders"')),
    ).toBe(true);
    expect(chain).toContain(rootCause);
    expect(borderLayoutCalls).toBe(1);
    expect(raisedFailure).toBe(expectedFailure);
  });
});
