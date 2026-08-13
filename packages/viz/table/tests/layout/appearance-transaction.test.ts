import type { IRChild, LayoutCompositeCompileContext, ScenePrimitive } from '@retikz/core';

import { compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { PresentedTableModel } from '../../src';
import type { ResolvedTableTransaction } from '../../src/pipeline/layout';

import { resolvePresentedTableTransaction } from '../../src/pipeline/layout';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { presentTable } from '../../src/pipeline/presentation';
import { formatDefaultTable } from '../utils/stages';

const flattenScenePrimitives = (primitives: ReadonlyArray<ScenePrimitive>): ReadonlyArray<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenScenePrimitives(primitive.children)] : [primitive],
  );

const contentNode = (id: string, fill: string, text = id): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  shape: 'rectangle',
  minimumSize: { width: 4, height: 4 },
  padding: 0,
  text,
  fill,
  stroke: 'none',
});

describe('Presented Table layout transaction', () => {
  it('does not claim a named style when token resolution is omitted', () => {
    const semantic = normalizeTableStructure({ kind: 'manual', rows: [['plain']] });
    const presented = presentTable(formatDefaultTable(semantic));
    let transaction: ResolvedTableTransaction | undefined;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'unstyled-presented-table',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('unstyled-presented-table'),
      }),
      compile: (_node, context) => {
        transaction = resolvePresentedTableTransaction({ presented }, context);
        return { children: transaction.children };
      },
    });

    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ namespace: 'fixture', type: 'unstyled-presented-table' }],
      },
      { composites: [harness], padding: 0 },
    );

    expect(transaction?.manifest).toMatchObject({
      style: { themeMode: 'light' },
      cells: [{ appearance: {} }],
      borders: [],
    });
  });

  it('fails loud for a mixed Presented content branch before probing Core content', () => {
    const semantic = normalizeTableStructure({
      kind: 'manual',
      rows: [[{ id: 'mixed', content: contentNode('mixed-content', '#111111') }]],
    });
    const presented = presentTable(formatDefaultTable(semantic));
    const malformed = {
      ...presented,
      cells: [{ ...presented.cells[0], rawValue: 'leaked-value-trace' }],
    } as unknown as PresentedTableModel;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'malformed-presented-table',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('malformed-presented-table'),
      }),
      compile: (_node, context) => {
        const transaction = resolvePresentedTableTransaction({ presented: malformed }, context);
        return { children: transaction.children };
      },
    });

    expect(() =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [{ namespace: 'fixture', type: 'malformed-presented-table' }],
        },
        { composites: [harness], padding: 0 },
      ),
    ).toThrow(/transaction presentation Cell 0 shape differs/i);
  });

  it('fails loud when a Presented raw value differs from the canonical semantic payload', () => {
    const semantic = normalizeTableStructure({ kind: 'manual', rows: [[{ id: 'tampered', value: 7 }]] });
    const presented = presentTable(formatDefaultTable(semantic));
    const malformed = {
      ...presented,
      cells: [{ ...presented.cells[0], rawValue: 9 }],
    } as PresentedTableModel;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'tampered-presented-table',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('tampered-presented-table'),
      }),
      compile: (_node, context) => {
        const transaction = resolvePresentedTableTransaction({ presented: malformed }, context);
        return { children: transaction.children };
      },
    });

    expect(() =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [{ namespace: 'fixture', type: 'tampered-presented-table' }],
        },
        { composites: [harness], padding: 0 },
      ),
    ).toThrow(/transaction presentation Cell 0 raw value differs/i);
  });

  it('consumes supplied appearances through the real layout transaction', () => {
    const wrapProbe = defineComposite({
      namespace: 'fixture',
      type: 'styled-wrap-probe',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('styled-wrap-probe'),
        contentId: z.string().min(1),
      }),
      compile: node => {
        return {
          children: [
            {
              type: 'node',
              id: node.contentId,
              position: [0, 0],
              shape: 'rectangle',
              text: 'wrapped cell content',
              fill: '#111111',
              stroke: 'none',
            },
          ],
        };
      },
    });
    const semantic = normalizeTableStructure({
      kind: 'manual',
      rows: [
        [
          {
            id: 'left',
            content: { namespace: 'fixture', type: 'styled-wrap-probe', contentId: 'left-content' },
            layout: { wrap: true, borders: { bottom: { kind: 'line', stroke: '#ff00ff', width: 8 } } },
          },
          {
            id: 'right',
            content: { namespace: 'fixture', type: 'styled-wrap-probe', contentId: 'right-content' },
            layout: { wrap: true },
          },
        ],
      ],
    });
    const presented = presentTable(formatDefaultTable(semantic), {
      cells: [
        {
          kind: 'content',
          cellId: 'left',
          appearance: {
            background: { fill: '#ff0000' },
            content: { nodeDefault: { font: { size: 40 }, padding: 20 } },
            borders: { bottom: { kind: 'line', stroke: '#0000ff', width: 2 } },
          },
        },
        {
          kind: 'content',
          cellId: 'right',
          appearance: { background: { fill: '#00ff00', fillOpacity: 0.5 } },
        },
      ],
    });
    let transaction: ResolvedTableTransaction | undefined;
    const layoutCalls: Array<Readonly<{ cellId: string; xKind: string }>> = [];
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'presented-table-transaction',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('presented-table-transaction'),
      }),
      compile: (_node, context) => {
        const tableContext: LayoutCompositeCompileContext = {
          ...context,
          layoutChild: (child, proposal) => {
            const cell = presented.cells.find(candidate => candidate.content === child);
            if (cell !== undefined) layoutCalls.push({ cellId: cell.cellId, xKind: proposal.x.kind });
            return context.layoutChild(child, proposal);
          },
        };
        transaction = resolvePresentedTableTransaction(
          {
            tableId: 'styled',
            layout: {
              columnSize: { kind: 'fixed', value: 20 },
              rowSize: { kind: 'fixed', value: 10 },
            },
            presented,
          },
          tableContext,
        );
        return { children: transaction.children };
      },
    });
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'scope',
            stroke: '#f97316',
            strokeWidth: 12,
            children: [{ namespace: 'fixture', type: 'presented-table-transaction' }],
          },
        ],
      },
      { composites: [wrapProbe, harness], padding: 0 },
    );
    const primitives = flattenScenePrimitives(result.scene.primitives);

    transaction?.manifest.cells.forEach(cell => {
      expect(cell.visualOverflowBounds.x).toBeLessThanOrEqual(cell.box.x);
      expect(cell.visualOverflowBounds.y).toBeLessThanOrEqual(cell.box.y);
      expect(cell.visualOverflowBounds.x + cell.visualOverflowBounds.width).toBeGreaterThanOrEqual(
        cell.box.x + cell.box.width,
      );
      expect(cell.visualOverflowBounds.y + cell.visualOverflowBounds.height).toBeGreaterThanOrEqual(
        cell.box.y + cell.box.height,
      );
    });
    expect(transaction?.manifest.cells[0].sourceAllocationBounds.height).toBeGreaterThan(
      transaction?.manifest.cells[1].sourceAllocationBounds.height ?? Number.POSITIVE_INFINITY,
    );
    expect(layoutCalls).toEqual([
      { cellId: 'left', xKind: 'intrinsic' },
      { cellId: 'right', xKind: 'intrinsic' },
      { cellId: 'left', xKind: 'range' },
      { cellId: 'right', xKind: 'range' },
    ]);
    const tableVisualBounds = transaction?.manifest.visualOverflowBounds;
    expect(tableVisualBounds?.x).toBeLessThanOrEqual(0);
    expect(tableVisualBounds?.y).toBeLessThanOrEqual(0);
    expect((tableVisualBounds?.x ?? 0) + (tableVisualBounds?.width ?? 0)).toBeGreaterThanOrEqual(40);
    expect((tableVisualBounds?.y ?? 0) + (tableVisualBounds?.height ?? 0)).toBeGreaterThanOrEqual(10);
    expect(result.scene.layout.x).toBeLessThanOrEqual(0);
    expect(result.scene.layout.y).toBeLessThanOrEqual(0);
    expect(result.scene.layout.x + result.scene.layout.width).toBeGreaterThanOrEqual(40);
    expect(result.scene.layout.y + result.scene.layout.height).toBeGreaterThanOrEqual(10);
    expect(
      primitives
        .filter(
          primitive =>
            primitive.type === 'path' &&
            primitive.fill !== undefined &&
            primitive.fill !== 'none' &&
            primitive.stroke === 'none',
        )
        .map(primitive =>
          primitive.type === 'path'
            ? {
                fill: primitive.fill,
                fillOpacity: primitive.fillOpacity,
                stroke: primitive.stroke,
                strokeOpacity: primitive.strokeOpacity,
                commands: primitive.commands,
              }
            : undefined,
        ),
    ).toEqual([
      {
        fill: '#ff0000',
        fillOpacity: 1,
        stroke: 'none',
        strokeOpacity: 0,
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [20, 0] },
          { kind: 'line', to: [20, 10] },
          { kind: 'line', to: [0, 10] },
          { kind: 'close' },
        ],
      },
      {
        fill: '#00ff00',
        fillOpacity: 0.5,
        stroke: 'none',
        strokeOpacity: 0,
        commands: [
          { kind: 'move', to: [20, 0] },
          { kind: 'line', to: [40, 0] },
          { kind: 'line', to: [40, 10] },
          { kind: 'line', to: [20, 10] },
          { kind: 'close' },
        ],
      },
    ]);
    expect(
      primitives.some(
        primitive =>
          primitive.type === 'path' && primitive.id?.startsWith('styled/border/') && primitive.stroke === '#0000ff',
      ),
    ).toBe(true);
    expect(primitives.some(primitive => primitive.type === 'path' && primitive.stroke === '#ff00ff')).toBe(false);
    const backgroundIndexes = primitives.flatMap((primitive, index) =>
      primitive.type === 'path' && primitive.fill !== undefined && primitive.fill !== 'none' ? [index] : [],
    );
    const contentIndexes = primitives.flatMap((primitive, index) =>
      primitive.id === 'left-content' || primitive.id === 'right-content' ? [index] : [],
    );
    const borderIndexes = primitives.flatMap((primitive, index) =>
      primitive.type === 'path' && primitive.id?.startsWith('styled/border/') ? [index] : [],
    );
    expect(Math.max(...backgroundIndexes)).toBeLessThan(Math.min(...contentIndexes));
    expect(Math.max(...contentIndexes)).toBeLessThan(Math.min(...borderIndexes));
  });

  it('omits cleared, transparent, and zero-area backgrounds without losing a visible background-only Cell', () => {
    const invisibleContent = (id: string): IRChild => ({
      type: 'node',
      id,
      position: [0, 0],
      shape: 'rectangle',
      minimumSize: 0,
      padding: 0,
      fill: 'none',
      stroke: 'none',
      opacity: 0,
    });
    const semantic = normalizeTableStructure({
      kind: 'manual',
      rows: [
        [
          { id: 'empty', content: invisibleContent('empty-content') },
          { id: 'none', content: invisibleContent('none-content') },
          { id: 'transparent', content: invisibleContent('transparent-content') },
          { id: 'visible', content: invisibleContent('visible-content') },
        ],
        [{ id: 'zero-area', content: invisibleContent('zero-content') }, null, null, null],
      ],
    });
    const presented = presentTable(formatDefaultTable(semantic), {
      cells: [
        { kind: 'content', cellId: 'empty', appearance: {} },
        { kind: 'content', cellId: 'none', appearance: { background: { fill: 'none' } } },
        {
          kind: 'content',
          cellId: 'transparent',
          appearance: { background: { fill: '#ff0000', fillOpacity: 0 } },
        },
        { kind: 'content', cellId: 'visible', appearance: { background: { fill: '#facc15' } } },
        { kind: 'content', cellId: 'zero-area', appearance: { background: { fill: '#0ea5e9' } } },
      ],
    });
    let transaction: ResolvedTableTransaction | undefined;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'background-omission',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('background-omission'),
      }),
      compile: (_node, context) => {
        transaction = resolvePresentedTableTransaction(
          {
            layout: {
              columnSize: { kind: 'fixed', value: 10 },
              rowSize: { kind: 'fixed', value: 8 },
              rows: [{ index: 1, size: { kind: 'fixed', value: 0 } }],
            },
            presented,
          },
          context,
        );
        return { children: transaction.children };
      },
    });
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ namespace: 'fixture', type: 'background-omission' }],
      },
      { composites: [harness], padding: 0 },
    );
    const backgrounds = flattenScenePrimitives(result.scene.primitives).filter(
      primitive =>
        primitive.type === 'path' &&
        primitive.fill !== undefined &&
        primitive.fill !== 'none' &&
        primitive.stroke === 'none',
    );

    expect(backgrounds).toHaveLength(1);
    expect(backgrounds[0]).toMatchObject({ fill: '#facc15', fillOpacity: 1, strokeOpacity: 0 });
    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 40, height: 8 });
    expect(transaction?.manifest.cells.map(cell => cell.visualOverflowBounds)).toEqual([
      { x: 5, y: 4, width: 0, height: 0 },
      { x: 15, y: 4, width: 0, height: 0 },
      { x: 25, y: 4, width: 0, height: 0 },
      { x: 30, y: 0, width: 10, height: 8 },
      { x: 5, y: 8, width: 0, height: 0 },
    ]);
  });

  it('keeps background paint out of intrinsic track contributions', () => {
    const semantic = normalizeTableStructure({
      kind: 'manual',
      rows: [
        [
          { id: 'plain', content: contentNode('plain-content', '#111111', 'same') },
          { id: 'painted', content: contentNode('painted-content', '#111111', 'same') },
        ],
      ],
    });
    const presented = presentTable(formatDefaultTable(semantic), {
      cells: [
        { kind: 'content', cellId: 'plain', appearance: {} },
        { kind: 'content', cellId: 'painted', appearance: { background: { fill: '#dc2626' } } },
      ],
    });
    let transaction: ResolvedTableTransaction | undefined;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'background-intrinsic',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('background-intrinsic'),
      }),
      compile: (_node, context) => {
        transaction = resolvePresentedTableTransaction(
          {
            layout: { columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } },
            presented,
          },
          context,
        );
        return { children: transaction.children };
      },
    });
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ namespace: 'fixture', type: 'background-intrinsic' }],
      },
      { composites: [harness], padding: 0 },
    );

    expect(transaction?.manifest.columns[0].size).toBe(transaction?.manifest.columns[1].size);
    expect(transaction?.manifest.cells[1].box).toEqual({
      x: transaction?.manifest.columns[1].offset,
      y: 0,
      width: transaction?.manifest.columns[1].size,
      height: transaction?.manifest.rows[0].size,
    });
  });
});
