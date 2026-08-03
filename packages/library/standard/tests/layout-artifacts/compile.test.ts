import type { IRChild, IRScene, LayoutChildResult } from '@retikz/core';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
} from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { FlexLayoutCompileArtifact, GridLayoutCompileArtifact, OverlayLayoutCompileArtifact } from '../../src';

import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  FlexLayoutDefinition,
  FlexLayoutDirection,
  FlexLayoutWrap,
  GridLayoutDefinition,
  LayoutAlignment,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSizeParticipation,
  OverlayLayoutDefinition,
  OverlayPlacementKind,
} from '../../src';
import { createLayoutArtifactItem, sortLayoutSpacing } from '../../src/composites/layout/internal';

const ArtifactLeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal('layout-artifact-test'),
  type: z.literal('leaf'),
  id: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  originX: z.number().default(0),
  originY: z.number().default(0),
  firstBaseline: z.number().optional(),
  lastBaseline: z.number().optional(),
  visualX: z.number().optional(),
  visualY: z.number().optional(),
  visualSize: z.number().nonnegative().optional(),
});

const ArtifactLeafDefinition = defineComposite({
  namespace: 'layout-artifact-test',
  type: 'leaf',
  schema: ArtifactLeafSchema,
  compile: (node, context) => ({
    allocationBounds: {
      x: node.originX,
      y: node.originY,
      width: node.width,
      height: node.height,
    },
    alignmentGuides: [
      ...(node.firstBaseline === undefined
        ? []
        : [
            {
              name: LayoutAlignmentGuideName.FirstBaseline,
              dimension: LayoutAlignmentGuideDimension.Y,
              position: node.firstBaseline,
            } as const,
          ]),
      ...(node.lastBaseline === undefined
        ? []
        : [
            {
              name: LayoutAlignmentGuideName.LastBaseline,
              dimension: LayoutAlignmentGuideDimension.Y,
              position: node.lastBaseline,
            } as const,
          ]),
    ],
    children: [
      context.scope(
        { id: node.id },
        node.visualSize === undefined
          ? []
          : [
              {
                type: 'node',
                id: `${node.id}-visual`,
                position: [node.visualX ?? 0, node.visualY ?? 0],
                minimumSize: node.visualSize,
                padding: 0,
                margin: 0,
              },
            ],
      ),
    ],
  }),
});

const leaf = (
  id: string,
  width: number,
  height: number,
  origin: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
  options: Partial<{
    firstBaseline: number;
    lastBaseline: number;
    visualX: number;
    visualY: number;
    visualSize: number;
  }> = {},
): IRChild => ({
  namespace: 'layout-artifact-test',
  type: 'leaf',
  id,
  width,
  height,
  originX: origin.x,
  originY: origin.y,
  ...options,
});

const definitions = [
  FlexLayoutDefinition,
  GridLayoutDefinition,
  OverlayLayoutDefinition,
  ArtifactLeafDefinition,
] as const;

const compileWithWarnings = (children: IRScene['children']) => {
  const warnings: Array<string> = [];
  const output = compileToScene(
    { type: 'scene', version: 1, children },
    { composites: definitions, padding: 0, onWarn: warning => warnings.push(warning.code) },
  );
  return { output, warnings };
};

const compile = (children: IRScene['children']) => compileWithWarnings(children).output;

const compositeArtifacts = (output: ReturnType<typeof compile>) =>
  output.artifacts.filter(artifact => artifact.kind === 'composite');

describe('layout compile artifacts', () => {
  it('sorts spacing by axis, physical coordinates, kind, and stable generation order', () => {
    const firstDistributed = {
      kind: 'distributed',
      axis: 'x',
      bounds: { x: 0, y: 0, width: 1, height: 2 },
    } as const;
    const secondDistributed = {
      kind: 'distributed',
      axis: 'x',
      bounds: { x: 0, y: 0, width: 2, height: 2 },
    } as const;

    expect(
      sortLayoutSpacing([
        { kind: 'distributed', axis: 'y', bounds: { x: 0, y: 0, width: 2, height: 1 } },
        secondDistributed,
        firstDistributed,
        { kind: 'gap', axis: 'x', bounds: { x: 0, y: 0, width: 1, height: 2 } },
      ]),
    ).toEqual([
      { kind: 'gap', axis: 'x', bounds: { x: 0, y: 0, width: 1, height: 2 } },
      secondDistributed,
      firstDistributed,
      { kind: 'distributed', axis: 'y', bounds: { x: 0, y: 0, width: 2, height: 1 } },
    ]);
  });

  it('returns canonical zero geometry for empty default-content layouts', () => {
    const output = compile([
      createFlexLayout({}),
      createGridLayout({ columns: [{ kind: 'content', mode: 'natural' }] }),
      createOverlayLayout({}),
    ]);
    const artifacts = compositeArtifacts(output);

    expect(artifacts).toHaveLength(3);
    for (const artifact of artifacts) {
      expect(artifact.value).toMatchObject({
        container: {
          allocationBounds: { x: 0, y: 0, width: 0, height: 0 },
          contentBounds: { x: 0, y: 0, width: 0, height: 0 },
          visualBounds: { x: 0, y: 0, width: 0, height: 0 },
          visibleBounds: null,
        },
        items: [],
      });
    }
  });

  it('preserves fixed allocation and canonical zero visual geometry for empty layouts', () => {
    const output = compile([
      createFlexLayout({ size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } } }),
      createGridLayout({
        columns: [{ kind: 'fixed', value: 10 }],
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } },
      }),
      createOverlayLayout({ size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } } }),
    ]);
    const artifacts = compositeArtifacts(output);

    expect(artifacts).toHaveLength(3);
    for (const artifact of artifacts) {
      expect(artifact.value).toMatchObject({
        container: {
          allocationBounds: { x: 0, y: 0, width: 40, height: 20 },
          contentBounds: { x: 0, y: 0, width: 40, height: 20 },
          visualBounds: { x: 0, y: 0, width: 0, height: 0 },
          visibleBounds: null,
        },
        items: [],
      });
    }
  });

  it('records Flex physical lines, authored items, translated bounds and clip overflow', () => {
    const output = compile([
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 25 }, y: { kind: 'fixed', value: 20 } },
        wrap: FlexLayoutWrap.Wrap,
        columnGap: 6,
        overflow: LayoutOverflow.Clip,
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'a',
            child: leaf('a', 20, 8, { x: -2, y: 1 }),
            basis: 10,
            min: 0,
            max: 10,
          },
          { kind: LayoutItemKind.Flex, key: 'b', child: leaf('b', 20, 8) },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as FlexLayoutCompileArtifact;

    expect(artifact.value.kind).toBe('flex');
    expect(
      artifact.value.items.map(item => ({ key: item.key, sourceIndex: item.sourceIndex, line: item.line })),
    ).toEqual([
      { key: 'a', sourceIndex: 0, line: 0 },
      { key: 'b', sourceIndex: 1, line: 1 },
    ]);
    expect(artifact.value.lines.map(line => line.itemKeys)).toEqual([['a'], ['b']]);
    expect(artifact.value.items[0].slotBounds).not.toEqual(artifact.value.items[0].allocationBounds);
    expect(artifact.value.items[0].overflow.allocation.x).toBe(true);
    expectTypeOf(artifact).toEqualTypeOf<FlexLayoutCompileArtifact>();
  });

  it('records reverse and wrap-reverse Flex lines in final physical order', () => {
    const output = compile([
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'fixed', value: 50 } },
        direction: FlexLayoutDirection.RowReverse,
        wrap: FlexLayoutWrap.WrapReverse,
        columnGap: 5,
        rowGap: 5,
        alignItems: LayoutAlignment.Start,
        children: ['a', 'b', 'c'].map(key => ({
          kind: LayoutItemKind.Flex,
          key,
          child: leaf(key, 30, 10),
          basis: 30,
          shrink: 0,
        })),
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as FlexLayoutCompileArtifact;

    expect(artifact.value.items.map(item => ({ key: item.key, line: item.line }))).toEqual([
      { key: 'a', line: 2 },
      { key: 'b', line: 1 },
      { key: 'c', line: 0 },
    ]);
    expect(artifact.value.lines.map(line => line.itemKeys)).toEqual([['c'], ['b'], ['a']]);
    expect(artifact.value.lines.map(line => line.crossStart)).toEqual([10, 25, 40]);
  });

  it('records Grid explicit and implicit tracks with resolved item spans', () => {
    const output = compile([
      createGridLayout({
        columns: [{ kind: 'fixed', value: 10 }],
        implicitColumn: { kind: 'content', mode: 'natural' },
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'cell',
            child: leaf('cell', 12, 6),
            column: { start: 1, span: 1 },
            row: { start: 0, span: 1 },
          },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as GridLayoutCompileArtifact;

    expect(artifact.value.kind).toBe('grid');
    expect(
      artifact.value.columns.map(track => ({
        index: track.index,
        sourceKind: track.sourceKind,
        implicit: track.implicit,
      })),
    ).toEqual([
      { index: 0, sourceKind: 'fixed', implicit: false },
      { index: 1, sourceKind: 'content-natural', implicit: true },
    ]);
    expect(artifact.value.rows).toHaveLength(1);
    expect(artifact.value.items[0]).toMatchObject({ column: 1, row: 0, columnSpan: 1, rowSpan: 1 });
    expectTypeOf(artifact).toEqualTypeOf<GridLayoutCompileArtifact>();
  });

  it('classifies every Grid track source kind', () => {
    const output = compile([
      createGridLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 10 } },
        columns: [
          { kind: 'fixed', value: 10 },
          { kind: 'content', mode: 'minimum' },
          { kind: 'content', mode: 'natural' },
          { kind: 'fraction', factor: 1 },
          { kind: 'minmax', min: { kind: 'fixed', value: 5 }, max: { kind: 'fraction', factor: 1 } },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as GridLayoutCompileArtifact;

    expect(artifact.value.columns.map(track => track.sourceKind)).toEqual([
      'fixed',
      'content-minimum',
      'content-natural',
      'fraction',
      'minmax',
    ]);
    expect(artifact.value.columns.map(track => track.index)).toEqual([0, 1, 2, 3, 4]);
    expect(artifact.value.columns.every(track => track.implicit === false)).toBe(true);
  });

  it('keeps Overlay authored identity separate from stable paint order', () => {
    const output = compile([
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
        children: [
          { kind: LayoutItemKind.Overlay, key: 'a', child: leaf('a', 4, 4), zIndex: 2 },
          {
            kind: LayoutItemKind.Overlay,
            key: 'b',
            child: leaf('b', 4, 4),
            placement: { kind: OverlayPlacementKind.Positioned, at: { x: 50, y: 0 } },
            sizeParticipation: LayoutSizeParticipation.Exclude,
            zIndex: -1,
          },
          { kind: LayoutItemKind.Overlay, key: 'c', child: leaf('c', 4, 4), zIndex: 2 },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as OverlayLayoutCompileArtifact;

    expect(artifact.value.items.map(item => item.key)).toEqual(['a', 'b', 'c']);
    expect(artifact.value.paintOrder).toEqual(['b', 'a', 'c']);
    expect(artifact.value.items[1]).toMatchObject({
      placement: 'positioned',
      sizeParticipation: 'exclude',
      zIndex: -1,
    });
    expectTypeOf(artifact).toEqualTypeOf<OverlayLayoutCompileArtifact>();
  });

  it('records slot, allocation, visual and clip overflow without diagnostics', () => {
    const { output, warnings } = compileWithWarnings([
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 20 } },
        padding: 2,
        overflow: LayoutOverflow.Clip,
        justifyItems: LayoutAlignment.Start,
        alignItems: LayoutAlignment.Start,
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'allocation-overflow',
            child: leaf('allocation-overflow', 25, 8),
          },
          {
            kind: LayoutItemKind.Overlay,
            key: 'visual-overflow',
            child: leaf('visual-overflow', 4, 4, { x: 0, y: 0 }, { visualX: 30, visualY: 2, visualSize: 4 }),
          },
          {
            kind: LayoutItemKind.Overlay,
            key: 'fully-clipped',
            child: leaf('fully-clipped', 4, 4, { x: 0, y: 0 }, { visualX: 2, visualY: 2, visualSize: 4 }),
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 30, y: 0 },
              anchor: { x: 0, y: 0 },
            },
          },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as OverlayLayoutCompileArtifact;
    const allocation = artifact.value.items.find(item => item.key === 'allocation-overflow');
    const visual = artifact.value.items.find(item => item.key === 'visual-overflow');
    const fullyClipped = artifact.value.items.find(item => item.key === 'fully-clipped');

    expect(warnings).toEqual([]);
    expect(allocation).toMatchObject({
      marginBounds: { x: 2, y: 2, width: 16, height: 8 },
      slotBounds: { x: 2, y: 2, width: 16, height: 8 },
      allocationBounds: { x: 2, y: 2, width: 25, height: 8 },
      translation: { x: 2, y: 2 },
      overflow: { allocation: { x: true, y: false }, clipped: false },
    });
    expect(visual?.overflow).toMatchObject({
      allocation: { x: false, y: false },
      visual: { x: true, y: true },
      clipped: true,
    });
    expect(fullyClipped).toMatchObject({ visibleBounds: null, overflow: { clipped: true } });
  });

  it('marks an epsilon-small visual intersection change as actual clipping', () => {
    const delta = 1e-13;
    const result: LayoutChildResult = {
      slotSize: { width: 20, height: 20 },
      allocationBounds: { x: 0, y: 0, width: 20, height: 20 },
      visualBounds: { x: 0, y: 0, width: 20 + delta, height: 20 },
      replay: Object.freeze({}) as unknown as LayoutChildResult['replay'],
    };
    const item = createLayoutArtifactItem({
      key: 'epsilon-clipped',
      sourceIndex: 0,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      slotBounds: { x: 0, y: 0, width: 20, height: 20 },
      result,
      translation: { x: 0, y: 0 },
      containerAllocation: { x: 0, y: 0, width: 20, height: 20 },
      overflow: LayoutOverflow.Clip,
    });

    expect(item.visualBounds.x + item.visualBounds.width).toBeGreaterThan(20);
    expect(item.visibleBounds).not.toEqual(item.visualBounds);
    expect(item.overflow.clipped).toBe(true);
  });

  it('keeps container visible bounds null when opposite-side items are fully clipped', () => {
    const output = compile([
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 20 } },
        overflow: LayoutOverflow.Clip,
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'left',
            child: leaf('left', 4, 4, { x: 0, y: 0 }, { visualX: 2, visualY: 2, visualSize: 4 }),
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: -10, y: 0 },
              anchor: { x: 0, y: 0 },
            },
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
          {
            kind: LayoutItemKind.Overlay,
            key: 'right',
            child: leaf('right', 4, 4, { x: 0, y: 0 }, { visualX: 2, visualY: 2, visualSize: 4 }),
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 30, y: 0 },
              anchor: { x: 0, y: 0 },
            },
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as OverlayLayoutCompileArtifact;

    expect(artifact.value.items.map(item => item.visibleBounds)).toEqual([null, null]);
    expect(artifact.value.container.visibleBounds).toBeNull();
  });

  it('normalizes single and separated degenerate visible-policy bounds to null', () => {
    const positionedItem = (key: string, x: number) => ({
      kind: LayoutItemKind.Overlay,
      key,
      child: leaf(key, 4, 4),
      placement: {
        kind: OverlayPlacementKind.Positioned,
        at: { x, y: 0 },
        anchor: { x: 0, y: 0 },
      },
      sizeParticipation: LayoutSizeParticipation.Exclude,
    });
    const output = compile([
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 20 } },
        overflow: LayoutOverflow.Visible,
        children: [positionedItem('single', 4)],
      }),
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 20 } },
        overflow: LayoutOverflow.Visible,
        children: [positionedItem('left-degenerate', -10), positionedItem('right-degenerate', 30)],
      }),
    ]);
    const artifacts = compositeArtifacts(output) as Array<OverlayLayoutCompileArtifact>;

    expect(artifacts[0].value.items.map(item => item.visibleBounds)).toEqual([null]);
    expect(artifacts[0].value.container.visibleBounds).toBeNull();
    expect(artifacts[1].value.items.map(item => item.visibleBounds)).toEqual([null, null]);
    expect(artifacts[1].value.container.visibleBounds).toBeNull();
  });

  it('records translated real and fallback alignment guides', () => {
    const output = compile([
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 30 }, y: { kind: 'fixed', value: 20 } },
        padding: 2,
        justifyItems: LayoutAlignment.Start,
        alignItems: LayoutAlignment.FirstBaseline,
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'real',
            child: leaf('real', 10, 5, { x: 0, y: 0 }, { firstBaseline: 3 }),
          },
          { kind: LayoutItemKind.Overlay, key: 'fallback', child: leaf('fallback', 10, 6) },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output)[0] as OverlayLayoutCompileArtifact;

    expect(artifact.value.items.map(item => ({ key: item.key, guide: item.alignmentGuide }))).toEqual([
      { key: 'real', guide: { name: 'first-baseline', position: 5, fallback: false } },
      { key: 'fallback', guide: { name: 'first-baseline', position: 5, fallback: true } },
    ]);
  });

  it('keeps an empty fill layout allocation inside a finite parent slot', () => {
    const inner = createGridLayout({
      columns: [{ kind: 'fixed', value: 10 }],
      size: { x: { kind: 'fill' }, y: { kind: 'fill' } },
    });
    const output = compile([
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } },
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'fill',
            child: inner,
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 0, y: 0 },
              anchor: { x: 0, y: 0 },
              width: 40,
              height: 20,
            },
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
    ]);
    const artifact = compositeArtifacts(output).find(value => value.type === 'gridLayout') as GridLayoutCompileArtifact;

    expect(artifact.value).toEqual({
      kind: 'grid',
      container: {
        allocationBounds: { x: 0, y: 0, width: 40, height: 20 },
        contentBounds: { x: 0, y: 0, width: 40, height: 20 },
        visualBounds: { x: 0, y: 0, width: 0, height: 0 },
        visibleBounds: null,
      },
      items: [],
      columns: [{ index: 0, start: 0, size: 10, sourceKind: 'fixed', implicit: false }],
      rows: [{ index: 0, start: 0, size: 0, sourceKind: 'content-natural', implicit: true }],
      spacing: [
        { kind: 'distributed', axis: 'x', bounds: { x: 10, y: 0, width: 30, height: 20 } },
        { kind: 'distributed', axis: 'y', bounds: { x: 0, y: 0, width: 40, height: 20 } },
      ],
    });
  });

  it('keeps nested layout artifacts in independent occurrences and local key spaces', () => {
    const inner = createOverlayLayout({
      size: { x: { kind: 'fixed', value: 10 }, y: { kind: 'fixed', value: 10 } },
      children: [{ kind: LayoutItemKind.Overlay, key: 'local', child: leaf('nested-leaf', 5, 5) }],
    });
    const output = compile([
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
        children: [{ kind: LayoutItemKind.Flex, key: 'local', child: inner }],
      }),
    ]);
    const artifacts = compositeArtifacts(output);
    const flex = artifacts.find(artifact => artifact.type === 'flexLayout') as FlexLayoutCompileArtifact;
    const overlay = artifacts.find(artifact => artifact.type === 'overlayLayout') as OverlayLayoutCompileArtifact;

    expect(flex.value.items[0].key).toBe('local');
    expect(overlay.value.items[0].key).toBe('local');
    expect(flex.occurrence).not.toEqual(overlay.occurrence);
    expect(overlay.occurrence.expansionPath.some(segment => segment.kind === 'replay')).toBe(true);
  });
});
