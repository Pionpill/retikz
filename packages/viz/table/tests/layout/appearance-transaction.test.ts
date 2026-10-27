import type { IRChild, ScenePrimitive } from '@retikz/core';
import { compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { IRTable } from '../../src';
import { TableSchema } from '../../src';
import { resolveTableTransaction } from '../../src/pipeline/layout';
import { CLEAN_TABLE_DEFAULTS } from '../fixtures/clean-table-defaults';

const flattenScenePrimitives = (primitives: ReadonlyArray<ScenePrimitive>): ReadonlyArray<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenScenePrimitives(primitive.children)] : [primitive],
  );

const contentNode = (id: string, fill: string, text = id): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  shape: 'rectangle',
  text,
  style: { fill, stroke: 'none' },
  layout: { minimumSize: { width: 4, height: 4 }, padding: 0 },
});

describe('提出 Table 布局交易', () => {
  it('通过真实布局事务消费提供的外观', () => {
    const wrapProbe = defineComposite({
      namespace: 'fixture',
      type: 'styled-wrap-probe',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('styled-wrap-probe'),
        contentId: NonBlankStringSchema,
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
              style: { fill: '#111111', stroke: 'none' },
            },
          ],
        };
      },
    });
    const structure: IRTable['structure'] = {
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
    };
    const rules: IRTable['rules'] = [
      {
        selector: { cellIds: ['left'] },
        appearance: {
          background: { fill: '#ff0000' },
          content: {
            defaults: {
              node: {
                style: { font: { size: 40 } },
                layout: { padding: 20 },
              },
            },
          },
          borders: { bottom: { kind: 'line', stroke: '#0000ff', width: 2 } },
        },
      },
      { selector: { cellIds: ['right'] }, appearance: { background: { fill: '#00ff00', fillOpacity: 0.5 } } },
    ];
    let transaction: ReturnType<typeof resolveTableTransaction> | undefined;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'presented-table-transaction',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('presented-table-transaction'),
      }),
      compile: (_node, context) => {
        transaction = resolveTableTransaction(
          TableSchema.parse({
            namespace: 'table',
            type: 'table',
            defaultTable: CLEAN_TABLE_DEFAULTS,
            structure,
            rules,
            id: 'styled',
            layout: {
              columnSize: { kind: 'fixed', value: 20 },
              rowSize: { kind: 'fixed', value: 10 },
            },
          }),
          {},
          {},
          context,
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
            children: [{ namespace: 'fixture', type: 'presented-table-transaction' }],
            defaults: { style: { stroke: '#f97316', strokeWidth: 12 } },
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

  it('省略清除的、透明的和零区域的背景，而不会丢失仅可见的背景 Cell', () => {
    const invisibleContent = (id: string): IRChild => ({
      type: 'node',
      id,
      position: [0, 0],
      shape: 'rectangle',
      style: { fill: 'none', stroke: 'none', opacity: 0 },
      layout: { minimumSize: 0, padding: 0 },
    });
    const structure: IRTable['structure'] = {
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
    };
    const rules: IRTable['rules'] = [
      { selector: { cellIds: ['empty'] }, appearance: {} },
      { selector: { cellIds: ['none'] }, appearance: { background: { fill: 'none' } } },
      { selector: { cellIds: ['transparent'] }, appearance: { background: { fill: '#ff0000', fillOpacity: 0 } } },
      { selector: { cellIds: ['visible'] }, appearance: { background: { fill: '#facc15' } } },
      { selector: { cellIds: ['zero-area'] }, appearance: { background: { fill: '#0ea5e9' } } },
    ];
    let transaction: ReturnType<typeof resolveTableTransaction> | undefined;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'background-omission',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('background-omission'),
      }),
      compile: (_node, context) => {
        transaction = resolveTableTransaction(
          TableSchema.parse({
            namespace: 'table',
            type: 'table',
            defaultTable: CLEAN_TABLE_DEFAULTS,
            structure,
            rules,
            layout: {
              columnSize: { kind: 'fixed', value: 10 },
              rowSize: { kind: 'fixed', value: 8 },
              rows: [{ index: 1, size: { kind: 'fixed', value: 0 } }],
            },
          }),
          {},
          {},
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

  it('使背景涂料远离固有轨道贡献', () => {
    const structure: IRTable['structure'] = {
      kind: 'manual',
      rows: [
        [
          { id: 'plain', content: contentNode('plain-content', '#111111', 'same') },
          { id: 'painted', content: contentNode('painted-content', '#111111', 'same') },
        ],
      ],
    };
    const rules: IRTable['rules'] = [
      { selector: { cellIds: ['plain'] }, appearance: {} },
      { selector: { cellIds: ['painted'] }, appearance: { background: { fill: '#dc2626' } } },
    ];
    let transaction: ReturnType<typeof resolveTableTransaction> | undefined;
    const harness = defineComposite({
      namespace: 'fixture',
      type: 'background-intrinsic',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('background-intrinsic'),
      }),
      compile: (_node, context) => {
        transaction = resolveTableTransaction(
          TableSchema.parse({
            namespace: 'table',
            type: 'table',
            defaultTable: CLEAN_TABLE_DEFAULTS,
            structure,
            rules,
            layout: { columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } },
          }),
          {},
          {},
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
