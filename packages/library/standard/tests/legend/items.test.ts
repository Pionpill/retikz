import type {
  CompileWarning,
  IRChild,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
  TranslateTransform,
} from '@retikz/core';

import {
  ChildSchema,
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { LegendItemsArtifact } from '../../src/composites/presentation/legend/artifact-types';
import type { LegendCompileArtifact } from '../../src/composites/presentation/legend/definition';
import type { LegendInput } from '../../src/composites/presentation/legend/types';

import { LayoutAlignment } from '../../src/composites/layout/shared';
import {
  LegendContentKind,
  LegendDirection,
  LegendSampleAlignment,
  LegendWrap,
} from '../../src/composites/presentation/legend/constants';
import { LegendDefinition } from '../../src/composites/presentation/legend/definition';
import { createLegend } from '../../src/composites/presentation/legend/factory';

const LeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal('legend-test'),
  type: z.literal('leaf'),
  id: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  minimumWidth: z.number().nonnegative().optional(),
  minimumHeight: z.number().nonnegative().optional(),
  originX: z.number().default(0),
  originY: z.number().default(0),
  exactAllocationWidth: z.number().nonnegative().optional(),
  exactAllocationHeight: z.number().nonnegative().optional(),
  failOnExact: z.boolean().default(false),
});

type ProbeLog = Readonly<{ id: string; proposal: LayoutProposal }>;

const createLeafDefinition = (logs: Array<ProbeLog>) =>
  defineComposite({
    namespace: 'legend-test',
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
      const width =
        context.proposal.x.kind === LayoutAxisProposalKind.Intrinsic && context.proposal.x.mode === 'minimum'
          ? (node.minimumWidth ?? node.width)
          : context.proposal.x.kind === LayoutAxisProposalKind.Exact && node.exactAllocationWidth !== undefined
            ? node.exactAllocationWidth
            : node.width;
      const height =
        context.proposal.y.kind === LayoutAxisProposalKind.Intrinsic && context.proposal.y.mode === 'minimum'
          ? (node.minimumHeight ?? node.height)
          : context.proposal.y.kind === LayoutAxisProposalKind.Exact && node.exactAllocationHeight !== undefined
            ? node.exactAllocationHeight
            : node.height;
      return {
        allocationBounds: { x: node.originX, y: node.originY, width, height },
        children: [context.scope({ id: node.id }, [])],
      };
    },
  });

const leaf = (
  id: string,
  width: number,
  height: number,
  options: Partial<{
    minimumWidth: number;
    minimumHeight: number;
    originX: number;
    originY: number;
    exactAllocationWidth: number;
    exactAllocationHeight: number;
    failOnExact: boolean;
  }> = {},
): IRChild => ({ namespace: 'legend-test', type: 'leaf', id, width, height, ...options });

const naturalProposal = (): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
});

const minimumProposal = (): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
});

const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});

const rangeProposal = (maxWidth?: number, maxHeight?: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Range, min: 0, ...(maxWidth === undefined ? {} : { max: maxWidth }) },
  y: { kind: LayoutAxisProposalKind.Range, min: 0, ...(maxHeight === undefined ? {} : { max: maxHeight }) },
});

const compileLegend = (child: IRChild, proposal: LayoutProposal = naturalProposal()) => {
  const logs: Array<ProbeLog> = [];
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'legend-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('legend-test'),
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
      children: [{ namespace: 'legend-test', type: 'harness', child }],
    },
    { composites: [LegendDefinition, createLeafDefinition(logs), harness], padding: 0 },
  );
  if (observed === undefined) throw new Error('Expected Legend probe to resolve');
  return { logs, observed, output };
};

const legendArtifactOf = (output: ReturnType<typeof compileToScene>): LegendItemsArtifact => {
  const artifact = output.artifacts.find(value => value.kind === 'composite' && value.type === 'legend');
  if (artifact === undefined) throw new Error('Expected Legend compile artifact');
  const value = (artifact as LegendCompileArtifact).value;
  if (value.kind !== LegendContentKind.Items) throw new Error('Expected Legend items artifact');
  return value;
};

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

/** Scene primitive tree 中的 Path primitive */
type ScenePathPrimitive = Extract<ScenePrimitive, { type: 'path' }>;

/** 收集 Scene primitive tree 中的全部 Path */
const pathsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePathPrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'path' ? [primitive] : primitive.type === 'group' ? pathsOf(primitive.children) : [],
  );

describe('Legend items compile contract', () => {
  it.each([
    [LayoutAlignment.Start, 0, 0],
    [LayoutAlignment.Center, 40, 30],
    [LayoutAlignment.End, 80, 60],
  ] as const)(
    'aligns title and items independently for contentAlign=%s, including title-only and items-only',
    (contentAlign, titleX, bodyX) => {
      const both = legendArtifactOf(
        compileLegend(
          createLegend({
            title: leaf('title', 20, 10),
            contentAlign,
            size: { x: { kind: 'fixed', value: 100 } },
            content: {
              kind: LegendContentKind.Items,
              items: [{ key: 'item', sample: leaf('sample', 40, 10) }],
            },
          }),
        ).output,
      );
      const titleOnly = legendArtifactOf(
        compileLegend(
          createLegend({
            title: leaf('title-only', 20, 10),
            contentAlign,
            size: { x: { kind: 'fixed', value: 100 } },
            content: { kind: LegendContentKind.Items, items: [] },
          }),
        ).output,
      );
      const itemsOnly = legendArtifactOf(
        compileLegend(
          createLegend({
            contentAlign,
            size: { x: { kind: 'fixed', value: 100 } },
            content: {
              kind: LegendContentKind.Items,
              direction: LegendDirection.Horizontal,
              sampleGap: 5,
              items: [{ key: 'item', sample: leaf('sample-only', 10, 10), label: leaf('label-only', 20, 10) }],
            },
          }),
        ).output,
      );

      expect(both.title?.slotBounds.x).toBe(titleX);
      expect(both.items[0]?.sample.slotBounds.x).toBe(bodyX);
      expect(titleOnly.title?.slotBounds.x).toBe(titleX);
      expect(itemsOnly.items[0]?.sample.slotBounds.x).toBe(
        contentAlign === LayoutAlignment.Start ? 0 : contentAlign === LayoutAlignment.Center ? 32.5 : 65,
      );
      expect((itemsOnly.items[0]?.label?.slotBounds.x ?? 0) - (itemsOnly.items[0]?.sample.slotBounds.x ?? 0)).toBe(15);
    },
  );

  it.each([
    [LayoutAlignment.Start, 0],
    [LayoutAlignment.Center, -10],
    [LayoutAlignment.End, -20],
  ] as const)('does not clamp overwide items for contentAlign=%s', (contentAlign, expectedX) => {
    const clipped = legendArtifactOf(
      compileLegend(
        createLegend({
          contentAlign,
          size: { x: { kind: 'fixed', value: 100 } },
          overflow: 'clip',
          content: { kind: LegendContentKind.Items, items: [{ key: 'wide', sample: leaf('wide', 120, 10) }] },
        }),
      ).output,
    );
    const visible = legendArtifactOf(
      compileLegend(
        createLegend({
          contentAlign,
          size: { x: { kind: 'fixed', value: 100 } },
          overflow: 'visible',
          content: { kind: LegendContentKind.Items, items: [{ key: 'wide', sample: leaf('wide', 120, 10) }] },
        }),
      ).output,
    );
    expect(clipped.items[0]?.sample.slotBounds.x).toBe(expectedX);
    expect(visible.items[0]?.sample.slotBounds.x).toBe(expectedX);
    expect(clipped.container.allocationBounds.width).toBe(100);
    expect(visible.container.allocationBounds.width).toBe(100);
  });

  it('lays out the default vertical form with a shared sample column and authored paint order', () => {
    const { logs, observed, output } = compileLegend(
      createLegend({
        title: leaf('title', 40, 4),
        titleGap: 2,
        content: {
          kind: LegendContentKind.Items,
          rowGap: 5,
          sampleGap: 3,
          items: [
            { key: 'a', sample: leaf('sample-a', 10, 10), label: leaf('label-a', 20, 8) },
            { key: 'b', sample: leaf('sample-b', 30, 6), label: leaf('label-b', 10, 12) },
          ],
        },
      }),
    );
    const artifact = legendArtifactOf(output);

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 53, height: 33 });
    expect(artifact.kind).toBe('items');
    expect(artifact.items.map(item => item.key)).toEqual(['a', 'b']);
    expect(artifact.items.map(item => item.sourceIndex)).toEqual([0, 1]);
    expect(artifact.items[0]?.sample.slotBounds).toEqual({ x: 0, y: 6, width: 30, height: 10 });
    expect(artifact.items[0]?.label?.slotBounds).toEqual({ x: 33, y: 7, width: 20, height: 8 });
    expect(artifact.items[1]?.sample.slotBounds).toEqual({ x: 0, y: 24, width: 30, height: 6 });
    expect(artifact.items[1]?.label?.slotBounds).toEqual({ x: 33, y: 21, width: 10, height: 12 });
    expect(translationOf(output.scene.primitives, 'title')).toEqual({ x: 0, y: 0 });
    expect(translationOf(output.scene.primitives, 'sample-a')).toEqual({ x: 0, y: 6 });
    expect(translationOf(output.scene.primitives, 'label-a')).toEqual({ x: 33, y: 7 });
    expect(logs.filter(log => log.proposal.x.kind === LayoutAxisProposalKind.Exact).map(log => log.id)).toEqual([
      'sample-a',
      'label-a',
      'sample-b',
      'label-b',
    ]);
  });

  it.each([
    [LegendSampleAlignment.Start, 0],
    [LegendSampleAlignment.Center, 5],
    [LegendSampleAlignment.End, 10],
  ] as const)('keeps sampleAlign=%s on the physical y axis in horizontal content', (sampleAlign, labelY) => {
    const { output } = compileLegend(
      createLegend({
        content: {
          kind: LegendContentKind.Items,
          direction: LegendDirection.Horizontal,
          sampleAlign,
          sampleGap: 2,
          items: [{ key: 'a', sample: leaf('sample', 10, 20), label: leaf('label', 5, 10) }],
        },
      }),
    );
    const artifact = legendArtifactOf(output);

    expect(artifact.items[0]?.sample.slotBounds.y).toBe(0);
    expect(artifact.items[0]?.label?.slotBounds).toEqual({ x: 12, y: labelY, width: 5, height: 10 });
  });

  it('forms rows once from the preliminary range budget and then shrinks content to the widest row', () => {
    const { observed, output } = compileLegend(
      createLegend({
        content: {
          kind: LegendContentKind.Items,
          direction: LegendDirection.Horizontal,
          wrap: LegendWrap.Wrap,
          columnGap: 10,
          rowGap: 4,
          items: [
            { key: 'wide', sample: leaf('wide', 120, 10) },
            { key: 'narrow', sample: leaf('narrow', 80, 10) },
          ],
        },
      }),
      rangeProposal(150),
    );
    const artifact = legendArtifactOf(output);

    expect(observed.allocationBounds.width).toBe(120);
    expect(artifact.items[0]?.sample.slotBounds.y).toBe(0);
    expect(artifact.items[1]?.sample.slotBounds.y).toBe(14);
    expect(artifact.container.allocationBounds.width).toBe(120);
  });

  it('keeps fixed, fill, and exact allocations after wrap while content intrinsic follows its contribution', () => {
    const content = {
      kind: LegendContentKind.Items,
      direction: LegendDirection.Horizontal,
      wrap: LegendWrap.Wrap,
      columnGap: 10,
      items: [
        { key: 'wide', sample: leaf('wide', 120, 10, { minimumWidth: 60 }) },
        { key: 'narrow', sample: leaf('narrow', 80, 10, { minimumWidth: 40 }) },
      ],
    } satisfies Extract<LegendInput['content'], { kind: typeof LegendContentKind.Items }>;

    expect(compileLegend(createLegend({ content }), naturalProposal()).observed.allocationBounds.width).toBe(210);
    expect(compileLegend(createLegend({ content }), minimumProposal()).observed.allocationBounds.width).toBe(60);
    expect(
      compileLegend(createLegend({ size: { x: { kind: 'fixed', value: 150 } }, content }), naturalProposal()).observed
        .allocationBounds.width,
    ).toBe(150);
    expect(
      compileLegend(createLegend({ size: { x: { kind: 'fill' } }, content }), rangeProposal(150, 100)).observed
        .allocationBounds.width,
    ).toBe(150);
    expect(compileLegend(createLegend({ content }), exactProposal(150, 100)).observed.allocationBounds.width).toBe(150);
    expect(() => compileLegend(createLegend({ size: { x: { kind: 'fill' } }, content }), naturalProposal())).toThrow(
      /fill requires a finite parent allocation on x/i,
    );
    expect(() => compileLegend(createLegend({ size: { x: { kind: 'fill' } }, content }), rangeProposal())).toThrow(
      /fill requires a finite parent allocation on x/i,
    );
  });

  it('preserves authored hard bounds when they do not intersect the parent proposal', () => {
    const { observed } = compileLegend(
      createLegend({
        size: { x: { kind: 'content', min: 200 }, y: { kind: 'content' } },
        content: { kind: LegendContentKind.Items, items: [{ key: 'sample', sample: leaf('sample', 20, 10) }] },
      }),
      exactProposal(100, 20),
    );

    expect(observed.slotSize.width).toBe(100);
    expect(observed.allocationBounds.width).toBe(200);
  });

  it('does not compress titleGap when fixed height leaves a zero body budget', () => {
    const { output } = compileLegend(
      createLegend({
        title: leaf('title', 20, 10),
        titleGap: 8,
        size: { x: { kind: 'content' }, y: { kind: 'fixed', value: 12 } },
        content: { kind: LegendContentKind.Items, items: [{ key: 'sample', sample: leaf('sample', 10, 10) }] },
      }),
    );
    const artifact = legendArtifactOf(output);

    expect(artifact.title?.slotBounds).toEqual({ x: 0, y: 0, width: 20, height: 10 });
    expect(artifact.items[0]?.sample.slotBounds.y).toBe(18);
    expect(artifact.container.allocationBounds.height).toBe(12);
  });

  it('uses no phantom gaps for title-only, empty, or unlabeled content and keeps asymmetric padding physical', () => {
    const titleOnly = legendArtifactOf(
      compileLegend(
        createLegend({
          title: leaf('title', 20, 10),
          titleGap: 50,
          padding: { top: 1, right: 2, bottom: 3, left: 4 },
          content: { kind: LegendContentKind.Items, items: [] },
        }),
      ).output,
    );
    const empty = legendArtifactOf(
      compileLegend(createLegend({ content: { kind: LegendContentKind.Items, items: [] } })).output,
    );
    const unlabeled = legendArtifactOf(
      compileLegend(
        createLegend({
          content: {
            kind: LegendContentKind.Items,
            sampleGap: 50,
            items: [{ key: 'sample', sample: leaf('sample', 10, 10) }],
          },
        }),
      ).output,
    );

    expect(titleOnly.container.allocationBounds).toEqual({ x: 0, y: 0, width: 26, height: 14 });
    expect(titleOnly.title?.slotBounds).toEqual({ x: 4, y: 1, width: 20, height: 10 });
    expect(titleOnly.bodyBounds).toBeNull();
    expect(empty.container.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(empty.title).toBeNull();
    expect(empty.bodyBounds).toBeNull();
    expect(unlabeled.container.allocationBounds.width).toBe(10);
  });

  it('keeps final allocation overhang observable without changing the structural container allocation', () => {
    const { observed, output } = compileLegend(
      createLegend({
        content: {
          kind: LegendContentKind.Items,
          items: [
            {
              key: 'sample',
              sample: leaf('sample', 10, 10, { exactAllocationWidth: 30, originX: -5 }),
            },
          ],
        },
      }),
    );
    const artifact = legendArtifactOf(output);

    expect(observed.allocationBounds.width).toBe(10);
    expect(artifact.items[0]?.sample.allocationBounds).toEqual({ x: 0, y: 0, width: 30, height: 10 });
    expect(artifact.items[0]?.sample.overflow.allocation.x).toBe(true);
    expect(artifact.bodyBounds).toEqual({ x: 0, y: 0, width: 30, height: 10 });
  });

  it('preserves authored Core Path stroke and dash semantics in a Legend sample', () => {
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createLegend({
            content: {
              kind: LegendContentKind.Items,
              items: [
                {
                  key: 'dependency',
                  sample: {
                    type: 'path',
                    stroke: '#0f766e',
                    strokeWidth: 3,
                    dashPattern: [4, 2],
                    children: [
                      { type: 'step', kind: 'move', to: [0, 0] },
                      { type: 'step', kind: 'line', to: [24, 0] },
                    ],
                  },
                },
              ],
            },
          }),
        ],
      },
      { composites: [LegendDefinition], padding: 0 },
    );
    const path = pathsOf(output.scene.primitives).find(primitive => primitive.stroke === '#0f766e');

    expect(path).toMatchObject({ stroke: '#0f766e', strokeWidth: 3, dashPattern: [4, 2] });
  });

  it('accepts a Core Scope as a Legend sample through the same probe and replay chain', () => {
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createLegend({
            content: {
              kind: LegendContentKind.Items,
              items: [
                {
                  key: 'scope',
                  sample: {
                    type: 'scope',
                    id: 'scope-sample',
                    children: [
                      {
                        type: 'node',
                        position: [0, 0],
                        text: '',
                        minimumSize: { width: 12, height: 8 },
                        padding: 0,
                      },
                    ],
                  },
                },
              ],
            },
          }),
        ],
      },
      { composites: [LegendDefinition], padding: 0 },
    );
    const sample = legendArtifactOf(output).items[0].sample;

    expect(sample.slotBounds.width).toBeGreaterThan(0);
    expect(sample.slotBounds.height).toBeGreaterThan(0);
    expect(translationOf(output.scene.primitives, 'scope-sample')).toEqual(sample.translation);
  });

  it('resolves a Legend Path sample reference from the ancestor compile environment', () => {
    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          { type: 'coordinate', id: 'ancestor', position: [40, 0] },
          createLegend({
            content: {
              kind: LegendContentKind.Items,
              items: [
                {
                  key: 'ancestor-reference',
                  sample: {
                    type: 'path',
                    children: [
                      { type: 'step', kind: 'move', to: [0, 0] },
                      { type: 'step', kind: 'line', to: { id: 'ancestor' } },
                    ],
                  },
                },
              ],
            },
          }),
        ],
      },
      { composites: [LegendDefinition], padding: 0, onWarn: warning => warnings.push(warning) },
    );
    const line = pathsOf(output.scene.primitives)
      .flatMap(path => path.commands)
      .find(command => command.kind === 'line');

    expect(warnings).toEqual([]);
    expect(line).toMatchObject({ to: [40, 0] });
  });

  it('raises an unresolved Path reference with the child provider and probe occurrence', () => {
    let thrown: unknown;
    try {
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            createLegend({
              content: {
                kind: LegendContentKind.Items,
                items: [
                  {
                    key: 'missing-reference',
                    sample: {
                      type: 'path',
                      children: [
                        { type: 'step', kind: 'move', to: [0, 0] },
                        { type: 'step', kind: 'line', to: { id: 'missing' } },
                      ],
                    },
                  },
                ],
              },
            }),
          ],
        },
        { composites: [LegendDefinition], padding: 0 },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/provider 'path'/i);
    expect((thrown as Error).message).toMatch(/children\[0\].*probe\[\d+\]/i);
    expect((thrown as Error).message).toMatch(/unresolved reference.*missing/i);
  });

  it('keeps a registered composite sample artifact in an independent Core envelope', () => {
    const typedSampleDefinition = defineComposite({
      namespace: 'legend-test',
      type: 'typed-sample',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('legend-test'),
        type: z.literal('typed-sample'),
      }),
      artifactSchema: z.strictObject({ role: z.literal('sample') }),
      compile: (_, context) => ({
        allocationBounds: { x: 0, y: 0, width: 16, height: 10 },
        children: [context.scope({ id: 'typed-sample' }, [])],
        artifact: { role: 'sample' },
      }),
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createLegend({
            content: {
              kind: LegendContentKind.Items,
              items: [{ key: 'typed', sample: { namespace: 'legend-test', type: 'typed-sample' } }],
            },
          }),
        ],
      },
      { composites: [LegendDefinition, typedSampleDefinition], padding: 0 },
    );
    const compositeArtifacts = output.artifacts.filter(artifact => artifact.kind === 'composite');
    const samplePlacement = legendArtifactOf(output).items[0]?.sample;

    expect(compositeArtifacts).toMatchObject([
      { kind: 'composite', namespace: 'standard', type: 'legend' },
      { kind: 'composite', namespace: 'legend-test', type: 'typed-sample', value: { role: 'sample' } },
    ]);
    expect(samplePlacement).not.toHaveProperty('role');
  });

  it('raises a required final child failure instead of replaying an earlier contribution probe', () => {
    expect(() =>
      compileLegend(
        createLegend({
          content: {
            kind: LegendContentKind.Items,
            items: [{ key: 'broken', sample: leaf('broken', 10, 10, { failOnExact: true }) }],
          },
        }),
      ),
    ).toThrow(/legend-test\.leaf.*children\[0\].*broken|broken.*children\[0\]/i);
  });

  it('raises an unregistered nested composite with its provider and sample occurrence', () => {
    expect(() =>
      compileLegend(
        createLegend({
          content: {
            kind: LegendContentKind.Items,
            items: [{ key: 'missing', sample: { namespace: 'missing', type: 'sample' } }],
          },
        }),
      ),
    ).toThrow(/missing\.sample.*children\[0\]|children\[0\].*missing\.sample/i);
  });

  it('commits replay duplicate ids with one Core warning and last-wins lookup', () => {
    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createLegend({
            content: {
              kind: LegendContentKind.Items,
              items: [
                {
                  key: 'duplicate',
                  sample: { type: 'coordinate', id: 'same', position: [0, 0] },
                  label: { type: 'coordinate', id: 'same', position: [20, 0] },
                },
              ],
            },
          }),
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, -10] },
              { type: 'step', kind: 'line', to: { id: 'same' } },
            ],
          },
        ],
      },
      { composites: [LegendDefinition], padding: 0, onWarn: warning => warnings.push(warning) },
    );
    const artifact = legendArtifactOf(output);
    const label = artifact.items[0].label;
    if (label === null) throw new Error('Expected label artifact');

    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(1);
    const path = output.scene.primitives.find(primitive => primitive.type === 'path');
    expect(path?.commands.find(command => command.kind === 'line')).toMatchObject({
      to: [20 + label.translation.x, label.translation.y],
    });
  });

  it('clips visible bounds without erasing real allocation and visual bounds', () => {
    const { output } = compileLegend(
      createLegend({
        contentAlign: LayoutAlignment.Center,
        size: { x: { kind: 'fixed', value: 10 }, y: { kind: 'fixed', value: 10 } },
        overflow: 'clip',
        content: {
          kind: LegendContentKind.Items,
          items: [
            {
              key: 'wide',
              sample: {
                type: 'node',
                position: [0, 0],
                text: '',
                minimumSize: { width: 30, height: 10 },
                padding: 0,
              },
            },
          ],
        },
      }),
    );
    const sample = legendArtifactOf(output).items[0].sample;

    expect(sample.allocationBounds.width).toBe(30);
    expect(sample.slotBounds.x).toBe(-10);
    expect(sample.visualBounds.width).toBeGreaterThanOrEqual(sample.allocationBounds.width);
    expect(sample.visibleBounds?.width).toBeLessThanOrEqual(10);
    expect(sample.overflow.clipped).toBe(true);
  });
});
