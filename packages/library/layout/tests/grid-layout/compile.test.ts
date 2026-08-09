import type { IRChild, LayoutChildResult, LayoutProposal, ScenePrimitive, TranslateTransform } from '@retikz/core';

import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { GridLayoutCompileArtifact } from '../../src';

import {
  createGridLayout,
  GridLayoutDefinition,
  LayoutAlignment,
  LayoutDistribution,
  LayoutItemKind,
  LayoutOverflow,
} from '../../src';

const LeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal('grid-test'),
  type: z.literal('leaf'),
  id: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  originX: z.number().default(0),
  originY: z.number().default(0),
  firstBaseline: z.number().optional(),
  lastBaseline: z.number().optional(),
  responsive: z.boolean().default(false),
  minimumWidth: z.number().nonnegative().optional(),
  area: z.number().nonnegative().optional(),
  failOnExact: z.boolean().default(false),
});

type ProbeLog = Readonly<{ id: string; proposal: LayoutProposal }>;

const createLeafDefinition = (logs: Array<ProbeLog>) =>
  defineComposite({
    namespace: 'grid-test',
    type: 'leaf',
    schema: LeafSchema,
    compile: (node, context) => {
      logs.push({ id: node.id, proposal: context.proposal });
      if (
        node.failOnExact &&
        (context.proposal.x.kind === LayoutAxisProposalKind.Exact ||
          context.proposal.y.kind === LayoutAxisProposalKind.Exact)
      ) {
        throw new Error(`Leaf '${node.id}' rejected an exact proposal`);
      }
      const width = node.responsive
        ? context.proposal.x.kind === LayoutAxisProposalKind.Exact
          ? context.proposal.x.value
          : context.proposal.x.kind === LayoutAxisProposalKind.Range
            ? Math.min(node.width, context.proposal.x.max ?? node.width)
            : context.proposal.x.mode === 'minimum'
              ? (node.minimumWidth ?? node.width)
              : node.width
        : node.width;
      const height = node.responsive && node.area !== undefined ? node.area / Math.max(1, width) : node.height;
      return {
        allocationBounds: { x: node.originX, y: node.originY, width, height },
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
        children: [context.scope({ id: node.id }, [])],
      };
    },
  });

const leaf = (
  id: string,
  width: number,
  height: number,
  options: Partial<{
    originX: number;
    originY: number;
    firstBaseline: number;
    lastBaseline: number;
    responsive: boolean;
    minimumWidth: number;
    area: number;
    failOnExact: boolean;
  }> = {},
): IRChild => ({ namespace: 'grid-test', type: 'leaf', id, width, height, ...options });

const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});

const compileGrid = (child: IRChild, proposal: LayoutProposal) => {
  const logs: Array<ProbeLog> = [];
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'grid-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('grid-test'),
      type: z.literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });
  const output = compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'grid-test', type: 'harness', child }],
    },
    {
      composites: [GridLayoutDefinition, createLeafDefinition(logs), harness],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('Expected GridLayout probe to resolve');
  return { logs, observed, output };
};

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'group' }>> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

const translationOf = (primitives: ReadonlyArray<ScenePrimitive>, id: string): Readonly<{ x: number; y: number }> => {
  const visit = (
    children: ReadonlyArray<ScenePrimitive>,
    x: number,
    y: number,
  ): Readonly<{ x: number; y: number }> | undefined => {
    for (const primitive of children) {
      if (primitive.type !== 'group') continue;
      const translations = (primitive.transforms ?? []).filter(
        (transform): transform is TranslateTransform => transform.kind === 'translate',
      );
      const nextX = x + translations.reduce((sum, transform) => sum + transform.x, 0);
      const nextY = y + translations.reduce((sum, transform) => sum + transform.y, 0);
      if (primitive.id === id) return { x: nextX, y: nextY };
      const nested = visit(primitive.children, nextX, nextY);
      if (nested !== undefined) return nested;
    }
    return undefined;
  };
  const result = visit(primitives, 0, 0);
  if (result === undefined) throw new Error(`Expected Scene group '${id}'`);
  return result;
};

const gridArtifactOf = (output: ReturnType<typeof compileToScene>): GridLayoutCompileArtifact => {
  const artifact = output.artifacts.find(value => value.kind === 'composite' && value.type === 'gridLayout');
  if (artifact === undefined) throw new Error('Expected GridLayout compile artifact');
  return artifact as GridLayoutCompileArtifact;
};

describe('GridLayout compile contract', () => {
  it('resolves fixed, content and fraction columns before placing authored children', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'content' } },
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'content', mode: 'natural' },
          { kind: 'fraction', factor: 1 },
        ],
        alignItems: LayoutAlignment.Start,
        children: [
          { kind: LayoutItemKind.Grid, key: 'fixed', child: leaf('fixed', 20, 10), column: { start: 0 } },
          { kind: LayoutItemKind.Grid, key: 'content', child: leaf('content', 30, 10), column: { start: 1 } },
          { kind: LayoutItemKind.Grid, key: 'fraction', child: leaf('fraction', 10, 10), column: { start: 2 } },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 100 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 10 });
    expect(translationOf(result.output.scene.primitives, 'fixed')).toEqual({ x: 0, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'content')).toEqual({ x: 20, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'fraction')).toEqual({ x: 50, y: 0 });
  });

  it('feeds frozen spanning column width into row contribution probes', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'content' } },
        columns: [
          { kind: 'fixed', value: 10 },
          { kind: 'fraction', factor: 1 },
        ],
        alignItems: LayoutAlignment.Start,
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'text',
            child: leaf('text', 100, 10, { responsive: true, minimumWidth: 10, area: 1000 }),
            column: { start: 0, span: 2 },
          },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 25 });
    expect(result.logs.some(log => log.proposal.x.kind === 'exact' && log.proposal.x.value === 40)).toBe(true);
  });

  it('uses exact proposals only for stretch and replays one final candidate per item', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 80 }, y: { kind: 'fixed', value: 20 } },
        columns: [
          { kind: 'fixed', value: 40 },
          { kind: 'fixed', value: 40 },
        ],
        alignItems: LayoutAlignment.Start,
        children: [
          { kind: LayoutItemKind.Grid, key: 'stretch', child: leaf('stretch', 10, 10), column: { start: 0 } },
          {
            kind: LayoutItemKind.Grid,
            key: 'bounded',
            child: leaf('bounded', 10, 10),
            column: { start: 1 },
            justifySelf: LayoutAlignment.Start,
          },
        ],
      }),
      exactProposal(80, 20),
    );
    const stretchFinal = result.logs.at(-2)?.proposal;
    const boundedFinal = result.logs.at(-1)?.proposal;

    expect(stretchFinal).toEqual({
      x: { kind: 'exact', value: 40 },
      y: { kind: 'range', min: 0, max: 10 },
    });
    expect(boundedFinal).toEqual({
      x: { kind: 'range', min: 0, max: 40 },
      y: { kind: 'range', min: 0, max: 10 },
    });
    expect(groupsOf(result.output.scene.primitives).filter(group => group.id === 'stretch')).toHaveLength(1);
    expect(groupsOf(result.output.scene.primitives).filter(group => group.id === 'bounded')).toHaveLength(1);
  });

  it('keeps structural slots separate from refused allocations and compensates non-zero origins', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } },
        columns: [{ kind: 'fixed', value: 40 }],
        rows: [{ kind: 'fixed', value: 20 }],
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'fixed',
            child: leaf('fixed', 80, 30, { originX: -5, originY: 2 }),
          },
        ],
      }),
      exactProposal(40, 20),
    );

    expect(result.logs.at(-1)?.proposal).toEqual(exactProposal(40, 20));
    expect(translationOf(result.output.scene.primitives, 'fixed')).toEqual({ x: 5, y: -2 });
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });

  it('aligns single-row baseline participants and excludes spanning items from the row metric', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'content' } },
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'fixed', value: 20 },
          { kind: 'fixed', value: 20 },
        ],
        alignItems: LayoutAlignment.FirstBaseline,
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'real',
            child: leaf('real', 20, 10, { firstBaseline: 7 }),
            column: { start: 0 },
          },
          { kind: LayoutItemKind.Grid, key: 'fallback', child: leaf('fallback', 20, 15), column: { start: 1 } },
          {
            kind: LayoutItemKind.Grid,
            key: 'span',
            child: leaf('span', 20, 100, { firstBaseline: 90 }),
            column: { start: 2 },
            row: { start: 0, span: 2 },
          },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 60 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(translationOf(result.output.scene.primitives, 'real')).toEqual({ x: 0, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'fallback')).toEqual({ x: 20, y: 7 });
    expect(result.observed.alignmentGuides?.find(guide => guide.name === 'first-baseline')?.position).toBe(7);
  });

  it('keeps a fixed row size when baseline allocation overflows it', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
        columns: [{ kind: 'fixed', value: 20 }],
        rows: [{ kind: 'fixed', value: 10 }],
        alignItems: LayoutAlignment.LastBaseline,
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'fixed',
            child: leaf('fixed', 20, 20, { lastBaseline: 15 }),
          },
        ],
      }),
      exactProposal(20, 10),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 20, height: 10 });
    expect(translationOf(result.output.scene.primitives, 'fixed')).toEqual({ x: 0, y: -5 });
    expect(result.observed.alignmentGuides?.find(guide => guide.name === 'last-baseline')?.position).toBe(10);
  });

  it('chooses the last authored real guide when a row has no last-baseline participant', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 10 } },
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'fixed', value: 20 },
        ],
        rows: [{ kind: 'fixed', value: 10 }],
        alignItems: LayoutAlignment.Start,
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'first',
            child: leaf('first', 20, 10, { lastBaseline: 3 }),
            column: { start: 0 },
          },
          {
            kind: LayoutItemKind.Grid,
            key: 'last',
            child: leaf('last', 20, 10, { lastBaseline: 8 }),
            column: { start: 1 },
          },
        ],
      }),
      exactProposal(40, 10),
    );

    expect(result.observed.alignmentGuides?.find(guide => guide.name === 'last-baseline')?.position).toBe(8);
  });

  it('raises the selected final failure instead of replaying an earlier contribution probe', () => {
    expect(() =>
      compileGrid(
        createGridLayout({
          size: { x: { kind: 'fixed', value: 30 }, y: { kind: 'fixed', value: 20 } },
          columns: [{ kind: 'content', mode: 'natural' }],
          children: [
            { kind: LayoutItemKind.Grid, key: 'failure', child: leaf('failure', 30, 10, { failOnExact: true }) },
          ],
        }),
        exactProposal(30, 20),
      ),
    ).toThrow(/rejected an exact proposal/);
  });

  it('uses a degenerate path clip without changing a zero-area allocation', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 0 }, y: { kind: 'fixed', value: 20 } },
        columns: [{ kind: 'fixed', value: 0 }],
        rows: [{ kind: 'fixed', value: 20 }],
        overflow: LayoutOverflow.Clip,
        children: [{ kind: LayoutItemKind.Grid, key: 'child', child: leaf('child', 10, 10) }],
      }),
      exactProposal(0, 20),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 20 });
    expect(
      (result.output.scene.resources ?? []).some(
        resource => resource.kind === 'clip' && resource.shape.kind === 'path',
      ),
    ).toBe(true);
  });

  it('supports nested GridLayout through the same custom composite registry', () => {
    const inner = createGridLayout({
      size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
      columns: [{ kind: 'fixed', value: 20 }],
      rows: [{ kind: 'fixed', value: 10 }],
      children: [{ kind: LayoutItemKind.Grid, key: 'leaf', child: leaf('nested-leaf', 20, 10) }],
    });
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 50 }, y: { kind: 'fixed', value: 20 } },
        columns: [{ kind: 'fixed', value: 20 }],
        rows: [{ kind: 'fixed', value: 10 }],
        justifyItems: LayoutAlignment.Start,
        alignItems: LayoutAlignment.Start,
        children: [{ kind: LayoutItemKind.Grid, key: 'inner', child: inner }],
      }),
      exactProposal(50, 20),
    );

    expect(translationOf(result.output.scene.primitives, 'nested-leaf')).toEqual({ x: 0, y: 0 });
  });

  it('fails loudly with the physical axis when root fill has no finite parent allocation', () => {
    const proposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
    };

    expect(() =>
      compileGrid(
        createGridLayout({ columns: [{ kind: 'fixed', value: 1 }], size: { x: { kind: 'fill' } } }),
        proposal,
      ),
    ).toThrow('Layout fill requires a finite parent allocation on x');
    expect(() =>
      compileGrid(
        createGridLayout({ columns: [{ kind: 'fixed', value: 1 }], size: { y: { kind: 'fill' } } }),
        proposal,
      ),
    ).toThrow('Layout fill requires a finite parent allocation on y');
  });

  it('applies finite content distribution after fraction and minmax growth', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 10 } },
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'fixed', value: 20 },
        ],
        rows: [{ kind: 'fixed', value: 10 }],
        justifyContent: LayoutDistribution.SpaceBetween,
        justifyItems: LayoutAlignment.Start,
        children: [
          { kind: LayoutItemKind.Grid, key: 'a', child: leaf('a', 20, 10), column: { start: 0 } },
          { kind: LayoutItemKind.Grid, key: 'b', child: leaf('b', 20, 10), column: { start: 1 } },
        ],
      }),
      exactProposal(100, 10),
    );

    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'b')).toEqual({ x: 80, y: 0 });
  });

  it('records centered fixed gaps and distributed space on both full content bands', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 60 } },
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'fixed', value: 20 },
        ],
        rows: [
          { kind: 'fixed', value: 10 },
          { kind: 'fixed', value: 10 },
        ],
        columnGap: 10,
        rowGap: 10,
        justifyContent: LayoutDistribution.SpaceBetween,
        alignContent: LayoutDistribution.SpaceBetween,
      }),
      exactProposal(100, 60),
    );

    expect(gridArtifactOf(result.output).value.spacing).toEqual([
      { kind: 'distributed', axis: 'x', bounds: { x: 20, y: 0, width: 25, height: 60 } },
      { kind: 'gap', axis: 'x', bounds: { x: 45, y: 0, width: 10, height: 60 } },
      { kind: 'distributed', axis: 'x', bounds: { x: 55, y: 0, width: 25, height: 60 } },
      { kind: 'distributed', axis: 'y', bounds: { x: 0, y: 10, width: 100, height: 15 } },
      { kind: 'gap', axis: 'y', bounds: { x: 0, y: 25, width: 100, height: 10 } },
      { kind: 'distributed', axis: 'y', bounds: { x: 0, y: 35, width: 100, height: 15 } },
    ]);
  });

  it('records single-track leading and trailing distribution without inventing a gap', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 10 } },
        columns: [{ kind: 'fixed', value: 20 }],
        rows: [{ kind: 'fixed', value: 10 }],
        justifyContent: LayoutDistribution.Center,
      }),
      exactProposal(100, 10),
    );

    expect(gridArtifactOf(result.output).value.spacing).toEqual([
      { kind: 'distributed', axis: 'x', bounds: { x: 0, y: 0, width: 40, height: 10 } },
      { kind: 'distributed', axis: 'x', bounds: { x: 60, y: 0, width: 40, height: 10 } },
    ]);
  });

  it('keeps an authored gap but omits distributed segments under negative free space', () => {
    const result = compileGrid(
      createGridLayout({
        size: { x: { kind: 'fixed', value: 30 }, y: { kind: 'fixed', value: 10 } },
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'fixed', value: 20 },
        ],
        rows: [{ kind: 'fixed', value: 10 }],
        columnGap: 10,
        justifyContent: LayoutDistribution.End,
      }),
      exactProposal(30, 10),
    );

    expect(gridArtifactOf(result.output).value.spacing).toEqual([
      { kind: 'gap', axis: 'x', bounds: { x: 0, y: 0, width: 10, height: 10 } },
    ]);
  });
});
