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

import {
  createFlexLayout,
  FlexLayoutDefinition,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutAlignment,
  LayoutDistribution,
  LayoutItemKind,
  LayoutOverflow,
} from '../../src';

const LeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal('flex-test'),
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
  failExactWidth: z.number().nonnegative().optional(),
});

type ProbeLog = Readonly<{ id: string; proposal: LayoutProposal }>;

const createLeafDefinition = (logs: Array<ProbeLog>) =>
  defineComposite({
    namespace: 'flex-test',
    type: 'leaf',
    schema: LeafSchema,
    compile: (node, context) => {
      logs.push({ id: node.id, proposal: context.proposal });
      if (
        (node.failOnExact &&
          (context.proposal.x.kind === LayoutAxisProposalKind.Exact ||
            context.proposal.y.kind === LayoutAxisProposalKind.Exact)) ||
        (node.failExactWidth !== undefined &&
          context.proposal.x.kind === LayoutAxisProposalKind.Exact &&
          context.proposal.x.value === node.failExactWidth)
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
        allocationBounds: {
          x: node.originX,
          y: node.originY,
          width,
          height,
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
    failExactWidth: number;
  }> = {},
): IRChild => ({ namespace: 'flex-test', type: 'leaf', id, width, height, ...options });

const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});

const compileFlex = (child: IRChild, proposal: LayoutProposal) => {
  const logs: Array<ProbeLog> = [];
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'flex-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('flex-test'),
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
      children: [{ namespace: 'flex-test', type: 'harness', child }],
    },
    {
      composites: [FlexLayoutDefinition, createLeafDefinition(logs), harness],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('Expected FlexLayout probe to resolve');
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

describe('FlexLayout compile contract', () => {
  it('uses frozen grow slots, physical gaps and non-zero allocation origins for placement', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 30 } },
        alignItems: LayoutAlignment.Start,
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'a',
            child: leaf('a', 20, 10, { originX: -5, originY: 2 }),
            basis: 20,
            grow: 1,
            max: 30,
          },
          { kind: LayoutItemKind.Flex, key: 'b', child: leaf('b', 20, 10), basis: 20, grow: 3 },
        ],
      }),
      exactProposal(100, 30),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 30 });
    expect(result.logs.filter(log => log.proposal.x.kind === 'exact').map(log => [log.id, log.proposal.x])).toEqual(
      expect.arrayContaining([
        ['a', { kind: 'exact', value: 30 }],
        ['b', { kind: 'exact', value: 70 }],
      ]),
    );
    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 5, y: -2 });
    expect(translationOf(result.output.scene.primitives, 'b')).toEqual({ x: 30, y: 0 });
  });

  it('wraps lines in layout traversal while preserving authored paint order', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'fixed', value: 50 } },
        direction: FlexLayoutDirection.RowReverse,
        wrap: FlexLayoutWrap.WrapReverse,
        columnGap: 5,
        rowGap: 5,
        alignItems: LayoutAlignment.Start,
        alignContent: LayoutDistribution.Start,
        children: ['a', 'b', 'c'].map(key => ({
          kind: LayoutItemKind.Flex,
          key,
          child: leaf(key, 30, 10),
          basis: 30,
          shrink: 0,
        })),
      }),
      exactProposal(60, 50),
    );

    expect(
      groupsOf(result.output.scene.primitives)
        .filter(group => group.id !== undefined)
        .map(group => group.id),
    ).toEqual(['a', 'b', 'c']);
    expect(translationOf(result.output.scene.primitives, 'c')).toEqual({ x: 30, y: 10 });
    expect(translationOf(result.output.scene.primitives, 'b')).toEqual({ x: 30, y: 25 });
    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 30, y: 40 });
  });

  it('wraps content-sized layouts for intrinsic minimum and authored natural maximum', () => {
    const children = ['a', 'b', 'c'].map(key => ({
      kind: LayoutItemKind.Flex,
      key,
      child: leaf(key, 30, 10),
      basis: 30,
      shrink: 0,
    }));
    const minimum = compileFlex(
      createFlexLayout({
        wrap: FlexLayoutWrap.Wrap,
        rowGap: 5,
        alignItems: LayoutAlignment.Start,
        children: children.slice(0, 2),
      }),
      {
        x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
      },
    );
    const boundedNatural = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'content', max: 60 } },
        wrap: FlexLayoutWrap.Wrap,
        columnGap: 5,
        rowGap: 5,
        alignItems: LayoutAlignment.Start,
        children,
      }),
      {
        x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(minimum.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 30, height: 25 });
    expect(translationOf(minimum.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
    expect(translationOf(minimum.output.scene.primitives, 'b')).toEqual({ x: 0, y: 15 });
    expect(boundedNatural.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 60, height: 40 });
    expect(translationOf(boundedNatural.output.scene.primitives, 'c')).toEqual({ x: 0, y: 30 });
  });

  it('reverses physical placement once on row and column main axes', () => {
    const children = ['a', 'b'].map(key => ({
      kind: LayoutItemKind.Flex,
      key,
      child: leaf(key, 20, 20),
      basis: 20,
      shrink: 0,
    }));
    const row = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 20 } },
        direction: FlexLayoutDirection.RowReverse,
        alignItems: LayoutAlignment.Start,
        children,
      }),
      exactProposal(100, 20),
    );
    const column = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 100 } },
        direction: FlexLayoutDirection.ColumnReverse,
        alignItems: LayoutAlignment.Start,
        children,
      }),
      exactProposal(20, 100),
    );

    expect(translationOf(row.output.scene.primitives, 'a')).toEqual({ x: 80, y: 0 });
    expect(translationOf(row.output.scene.primitives, 'b')).toEqual({ x: 60, y: 0 });
    expect(translationOf(column.output.scene.primitives, 'a')).toEqual({ x: 0, y: 80 });
    expect(translationOf(column.output.scene.primitives, 'b')).toEqual({ x: 0, y: 60 });
  });

  it('does not raise a discarded numeric basis probe failure', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 30 }, y: { kind: 'fixed', value: 10 } },
        alignItems: LayoutAlignment.Start,
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'a',
            child: leaf('a', 30, 10, { failExactWidth: 20 }),
            basis: 20,
            grow: 1,
          },
        ],
      }),
      exactProposal(30, 10),
    );

    expect(result.logs.some(log => log.proposal.x.kind === 'exact' && log.proposal.x.value === 20)).toBe(false);
    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
  });

  it('performs the final exact cross probe only after stretch line slots are known', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 50 }, y: { kind: 'fixed', value: 40 } },
        children: [{ kind: LayoutItemKind.Flex, key: 'a', child: leaf('a', 20, 10), grow: 1 }],
      }),
      exactProposal(50, 40),
    );
    const final = result.logs.at(-1);

    expect(final).toEqual({ id: 'a', proposal: exactProposal(50, 40) });
    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
  });

  it('aligns real and fallback first baselines and returns outgoing row guides', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 50 }, y: { kind: 'content' } },
        alignItems: LayoutAlignment.FirstBaseline,
        children: [
          { kind: LayoutItemKind.Flex, key: 'a', child: leaf('a', 20, 10, { firstBaseline: 7 }), basis: 20 },
          { kind: LayoutItemKind.Flex, key: 'b', child: leaf('b', 20, 15), basis: 20 },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 50 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'b')).toEqual({ x: 20, y: 7 });
    expect(result.observed.alignmentGuides).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 7 },
      { name: 'last-baseline', dimension: 'y', position: 22 },
    ]);
  });

  it('aligns a real baseline even when the child allocation refuses the structural cross slot', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
        alignItems: LayoutAlignment.LastBaseline,
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'fixed',
            child: leaf('fixed', 20, 20, { lastBaseline: 15 }),
            basis: 20,
          },
        ],
      }),
      exactProposal(20, 10),
    );

    expect(translationOf(result.output.scene.primitives, 'fixed')).toEqual({ x: 0, y: -5 });
    expect(result.observed.alignmentGuides?.find(guide => guide.name === 'last-baseline')?.position).toBe(10);
  });

  it('keeps last-baseline descent anchored to the final expanded line end', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 30 } },
        alignItems: LayoutAlignment.LastBaseline,
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'last',
            child: leaf('last', 20, 10, { lastBaseline: 8 }),
            basis: 20,
          },
        ],
      }),
      exactProposal(20, 30),
    );

    expect(translationOf(result.output.scene.primitives, 'last')).toEqual({ x: 0, y: 20 });
    expect(result.observed.alignmentGuides?.find(guide => guide.name === 'last-baseline')?.position).toBe(28);
  });

  it('applies one container clip without changing the solved allocation', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 0 }, y: { kind: 'fixed', value: 20 } },
        overflow: LayoutOverflow.Clip,
        children: [{ kind: LayoutItemKind.Flex, key: 'a', child: leaf('a', 20, 10), shrink: 0 }],
      }),
      exactProposal(0, 20),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 20 });
    expect(groupsOf(result.output.scene.primitives).some(group => group.clipRef !== undefined)).toBe(true);
    expect(
      (result.output.scene.resources ?? []).some(
        resource => resource.kind === 'clip' && resource.shape.kind === 'path',
      ),
    ).toBe(true);
  });

  it('re-probes cross metrics after main shrink so responsive text-like children can grow in height', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'content' } },
        alignItems: LayoutAlignment.Start,
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'text',
            child: leaf('text', 100, 10, { responsive: true, minimumWidth: 10, area: 1000 }),
          },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 25 });
    expect(result.logs.at(-1)?.proposal).toEqual({
      x: { kind: 'exact', value: 40 },
      y: { kind: 'intrinsic', mode: 'natural' },
    });
  });

  it('stretches multiple wrapped line slots before issuing final exact-cross probes', () => {
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 30 }, y: { kind: 'fixed', value: 40 } },
        wrap: FlexLayoutWrap.Wrap,
        alignContent: LayoutDistribution.Stretch,
        children: ['a', 'b'].map(key => ({
          kind: LayoutItemKind.Flex,
          key,
          child: leaf(key, 30, 10),
          basis: 30,
          shrink: 0,
        })),
      }),
      exactProposal(30, 40),
    );
    const finalExact = result.logs.filter(log => log.proposal.x.kind === 'exact' && log.proposal.y.kind === 'exact');

    expect(finalExact.slice(-2).map(log => [log.id, log.proposal.y])).toEqual([
      ['a', { kind: 'exact', value: 20 }],
      ['b', { kind: 'exact', value: 20 }],
    ]);
    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'b')).toEqual({ x: 0, y: 20 });
  });

  it('supports nested FlexLayout through the same public Core proposal and replay path', () => {
    const inner = createFlexLayout({
      size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
      children: [{ kind: LayoutItemKind.Flex, key: 'leaf', child: leaf('nested-leaf', 20, 10) }],
    });
    const result = compileFlex(
      createFlexLayout({
        size: { x: { kind: 'fixed', value: 50 }, y: { kind: 'fixed', value: 20 } },
        alignItems: LayoutAlignment.Start,
        children: [{ kind: LayoutItemKind.Flex, key: 'inner', child: inner, basis: 20 }],
      }),
      exactProposal(50, 20),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 50, height: 20 });
    expect(translationOf(result.output.scene.primitives, 'nested-leaf')).toEqual({ x: 0, y: 0 });
  });

  it('raises the selected final child failure instead of replaying an earlier candidate', () => {
    expect(() =>
      compileFlex(
        createFlexLayout({
          size: { x: { kind: 'fixed', value: 30 }, y: { kind: 'fixed', value: 20 } },
          alignItems: LayoutAlignment.Start,
          children: [
            {
              kind: LayoutItemKind.Flex,
              key: 'failure',
              child: leaf('failure', 30, 10, { failOnExact: true }),
              basis: 'content',
            },
          ],
        }),
        exactProposal(30, 20),
      ),
    ).toThrow(/rejected an exact proposal/);
  });

  it('omits outgoing baseline guides for column directions', () => {
    const result = compileFlex(
      createFlexLayout({
        direction: FlexLayoutDirection.Column,
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 30 } },
        alignItems: LayoutAlignment.Start,
        children: [{ kind: LayoutItemKind.Flex, key: 'a', child: leaf('a', 10, 30), basis: 30 }],
      }),
      exactProposal(20, 30),
    );

    expect(result.observed.alignmentGuides).toBeUndefined();
    expect(translationOf(result.output.scene.primitives, 'a')).toEqual({ x: 0, y: 0 });
  });

  it('fails loudly with the physical axis when root fill has no finite parent allocation', () => {
    const proposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
    };

    expect(() =>
      compileFlex(
        createFlexLayout({
          size: { x: { kind: 'fill' }, y: { kind: 'content' } },
          children: [],
        }),
        proposal,
      ),
    ).toThrow('Standard layout fill requires a finite parent allocation on x');
    expect(() =>
      compileFlex(
        createFlexLayout({
          size: { x: { kind: 'content' }, y: { kind: 'fill' } },
          children: [],
        }),
        proposal,
      ),
    ).toThrow('Standard layout fill requires a finite parent allocation on y');
  });
});
