import type { GroupPrim, IRChild, LayoutChildResult, LayoutProposal, ScenePrimitive } from '@retikz/core';

import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LayoutAlignment } from '../../src/composites/layout/shared';
import { LegendContentKind, LegendDirection } from '../../src/composites/presentation/legend/constants';
import { LegendDefinition } from '../../src/composites/presentation/legend/definition';
import { createLegend } from '../../src/composites/presentation/legend/factory';
import { fullScopeProps } from '../composites/presentation/scope-props';

const LeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal('legend-ramp-test'),
  type: z.literal('leaf'),
  id: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  exactAllocationWidth: z.number().nonnegative().optional(),
  exactAllocationHeight: z.number().nonnegative().optional(),
});

const leaf = (
  id: string,
  width: number,
  height: number,
  options: Partial<{ exactAllocationWidth: number; exactAllocationHeight: number }> = {},
): IRChild => ({ namespace: 'legend-ramp-test', type: 'leaf', id, width, height, ...options });

const compileRamp = (child: IRChild, proposal?: LayoutProposal) => {
  let observed: LayoutChildResult | undefined;
  const leafDefinition = defineComposite({
    namespace: 'legend-ramp-test',
    type: 'leaf',
    schema: LeafSchema,
    compile: (node, context) => ({
      allocationBounds: {
        x: 0,
        y: 0,
        width:
          context.proposal.x.kind === LayoutAxisProposalKind.Exact && node.exactAllocationWidth !== undefined
            ? node.exactAllocationWidth
            : node.width,
        height:
          context.proposal.y.kind === LayoutAxisProposalKind.Exact && node.exactAllocationHeight !== undefined
            ? node.exactAllocationHeight
            : node.height,
      },
      children: [context.scope({ id: node.id }, [])],
    }),
  });
  const harness = defineComposite({
    namespace: 'legend-ramp-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('legend-ramp-test'),
      type: z.literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(
        node.child,
        proposal ?? {
          x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
        },
      );
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });
  const output = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'legend-ramp-test', type: 'harness', child }],
    },
    { composites: [LegendDefinition, leafDefinition, harness], padding: 0 },
  );
  if (observed === undefined) throw new Error('Expected Legend ramp probe to resolve');
  const envelope = output.artifacts.find(value => value.kind === 'composite');
  if (envelope === undefined) throw new Error('Expected Legend ramp artifact');
  return { observed, output, artifact: envelope.value };
};

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<GroupPrim> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

describe('Legend ramp compile contract', () => {
  it('keeps ramp authored Scope props separate from allocation and replay scopes', () => {
    const { output } = compileRamp(
      createLegend({
        ...fullScopeProps,
        id: 'ramp-root',
        overflow: 'clip',
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 30 } },
        content: {
          kind: LegendContentKind.Ramp,
          sample: leaf('sample', 80, 10),
          ticks: [{ key: 'middle', offset: 0.5, label: leaf('label', 20, 8) }],
        },
      }),
    );

    const root = groupsOf(output.scene.primitives).find(group => group.id === 'ramp-root');

    expect(root).toBeDefined();
    if (root === undefined) throw new Error('Expected authored Legend root Scope');
    expect(root).toMatchObject({
      id: 'ramp-root',
      meta: { source: 'scope-props-test' },
    });
    expect(root.transforms).toEqual(expect.arrayContaining([{ kind: 'translate', x: 4, y: 5 }]));
    expect(root.clipRef).toBeDefined();
    const allocation = root.children.find(child => child.type === 'group' && child.id === undefined);
    expect(allocation).toMatchObject({ type: 'group', clipRef: expect.any(String) });
    expect(allocation).not.toHaveProperty('meta');
    expect(groupsOf(output.scene.primitives).filter(group => group.clipRef !== undefined)).toHaveLength(2);
  });

  it.each([
    [LayoutAlignment.Start, 0, 0],
    [LayoutAlignment.Center, 70, 20],
    [LayoutAlignment.End, 140, 40],
  ] as const)(
    'aligns title and the complete ramp structure independently for contentAlign=%s',
    (contentAlign, titleX, bodyX) => {
      const { artifact } = compileRamp(
        createLegend({
          title: leaf('title', 20, 10),
          contentAlign,
          size: { x: { kind: 'fixed', value: 160 } },
          content: {
            kind: LegendContentKind.Ramp,
            direction: LegendDirection.Horizontal,
            sample: leaf('sample', 100, 10),
            sampleGap: 5,
            ticks: [
              { key: 'low', offset: 0, label: leaf('low', 20, 4) },
              { key: 'high', offset: 1, label: leaf('high', 20, 4) },
            ],
          },
        }),
      );
      if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');

      expect(artifact.title?.slotBounds.x).toBe(titleX);
      expect(artifact.bodyBounds.x).toBe(bodyX);
      expect(artifact.sample.slotBounds.x).toBe(bodyX + 10);
      expect(artifact.ticks.map(tick => tick.anchor.x)).toEqual([bodyX + 10, bodyX + 110]);
      expect(artifact.ticks[0]?.label?.slotBounds.x).toBe(bodyX);
    },
  );

  it.each([
    [LayoutAlignment.Start, 0],
    [LayoutAlignment.Center, 30],
    [LayoutAlignment.End, 60],
  ] as const)('aligns a ramp-only body for contentAlign=%s', (contentAlign, bodyX) => {
    const { artifact } = compileRamp(
      createLegend({
        contentAlign,
        size: { x: { kind: 'fixed', value: 100 } },
        content: {
          kind: LegendContentKind.Ramp,
          direction: LegendDirection.Horizontal,
          sample: leaf('sample', 40, 10),
          ticks: [],
        },
      }),
    );
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');

    expect(artifact.bodyBounds.x).toBe(bodyX);
    expect(artifact.sample.slotBounds.x).toBe(bodyX);
  });

  it.each([
    [LayoutAlignment.Start, 0],
    [LayoutAlignment.Center, -10],
    [LayoutAlignment.End, -20],
  ] as const)('does not clamp an overwide ramp for contentAlign=%s', (contentAlign, bodyX) => {
    const { artifact } = compileRamp(
      createLegend({
        contentAlign,
        size: { x: { kind: 'fixed', value: 100 } },
        overflow: 'clip',
        content: {
          kind: LegendContentKind.Ramp,
          direction: LegendDirection.Horizontal,
          sample: leaf('sample', 120, 10),
          ticks: [],
        },
      }),
    );
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');

    expect(artifact.sample.slotBounds.x).toBe(bodyX);
    expect(artifact.container.allocationBounds.width).toBe(100);
  });

  it('normalizes horizontal endpoint-label overhang together with sample slots and anchors', () => {
    const { observed, artifact } = compileRamp(
      createLegend({
        content: {
          kind: LegendContentKind.Ramp,
          direction: LegendDirection.Horizontal,
          sample: leaf('sample', 100, 10),
          sampleGap: 5,
          ticks: [
            { key: 'low', offset: 0, label: leaf('low', 20, 4) },
            { key: 'high', offset: 1, label: leaf('high', 20, 4) },
          ],
        },
      }),
    );

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 120, height: 19 });
    expect(artifact.kind).toBe('ramp');
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');
    expect(artifact.sample.slotBounds).toEqual({ x: 10, y: 0, width: 100, height: 10 });
    expect(artifact.ticks.map(tick => tick.anchor)).toEqual([
      { x: 10, y: 10 },
      { x: 110, y: 10 },
    ]);
    expect(artifact.ticks[0]?.label?.slotBounds).toEqual({ x: 0, y: 15, width: 20, height: 4 });
    expect(artifact.ticks[1]?.label?.slotBounds).toEqual({ x: 100, y: 15, width: 20, height: 4 });
  });

  it('normalizes vertical endpoint-label overhang and keeps sampleGap on physical x', () => {
    const { observed, artifact } = compileRamp(
      createLegend({
        content: {
          kind: LegendContentKind.Ramp,
          sample: leaf('sample', 10, 100),
          sampleGap: 5,
          ticks: [
            { key: 'top', offset: 0, label: leaf('top', 20, 20) },
            { key: 'bottom', offset: 1, label: leaf('bottom', 20, 20) },
          ],
        },
      }),
    );

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 35, height: 120 });
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');
    expect(artifact.sample.slotBounds).toEqual({ x: 0, y: 10, width: 10, height: 100 });
    expect(artifact.ticks.map(tick => tick.anchor)).toEqual([
      { x: 10, y: 10 },
      { x: 10, y: 110 },
    ]);
    expect(artifact.ticks[0]?.label?.slotBounds).toEqual({ x: 15, y: 0, width: 20, height: 20 });
    expect(artifact.ticks[1]?.label?.slotBounds).toEqual({ x: 15, y: 100, width: 20, height: 20 });
  });

  it('keeps dense authored ticks in order without collision avoidance', () => {
    const { artifact } = compileRamp(
      createLegend({
        content: {
          kind: LegendContentKind.Ramp,
          direction: LegendDirection.Horizontal,
          sample: leaf('sample', 100, 10),
          ticks: [
            { key: 'a', offset: 0.5, label: leaf('a', 30, 10) },
            { key: 'b', offset: 0.51, label: leaf('b', 30, 10) },
          ],
        },
      }),
    );

    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');
    expect(artifact.ticks.map(tick => tick.key)).toEqual(['a', 'b']);
    expect(artifact.ticks.map(tick => tick.anchor.x)).toEqual([50, 51]);
    expect(artifact.ticks[0]?.label?.slotBounds.x).toBe(35);
    expect(artifact.ticks[1]?.label?.slotBounds.x).toBe(36);
  });

  it('keeps empty ticks as a sample-only non-empty body without applying sampleGap', () => {
    const { observed, artifact } = compileRamp(
      createLegend({
        content: {
          kind: LegendContentKind.Ramp,
          direction: LegendDirection.Horizontal,
          sample: leaf('sample', 40, 12),
          sampleGap: 100,
          ticks: [],
        },
      }),
    );

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 12 });
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');
    expect(artifact.bodyBounds).toEqual({ x: 0, y: 0, width: 40, height: 12 });
    expect(artifact.sample.slotBounds).toEqual({ x: 0, y: 0, width: 40, height: 12 });
    expect(artifact.ticks).toEqual([]);
  });

  it('rejects a zero sample main axis but preserves a non-zero sample under a zero body budget', () => {
    expect(() =>
      compileRamp(
        createLegend({
          content: {
            kind: LegendContentKind.Ramp,
            direction: LegendDirection.Horizontal,
            sample: leaf('zero-width', 0, 10),
            ticks: [],
          },
        }),
      ),
    ).toThrow(/standard\.legend.*main-axis|main-axis.*standard\.legend/i);
    expect(() =>
      compileRamp(
        createLegend({
          content: {
            kind: LegendContentKind.Ramp,
            sample: leaf('zero-height', 10, 0),
            ticks: [],
          },
        }),
      ),
    ).toThrow(/standard\.legend.*main-axis|main-axis.*standard\.legend/i);

    const { artifact } = compileRamp(
      createLegend({
        title: leaf('title', 20, 10),
        titleGap: 8,
        size: { x: { kind: 'content' }, y: { kind: 'fixed', value: 10 } },
        content: { kind: LegendContentKind.Ramp, sample: leaf('sample', 10, 30), ticks: [] },
      }),
    );
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');
    expect(artifact.sample.slotBounds).toEqual({ x: 0, y: 18, width: 10, height: 30 });
    expect(artifact.container.allocationBounds.height).toBe(10);
  });

  it('does not move anchors or expand container sizing for final allocation overhang', () => {
    const { observed, artifact } = compileRamp(
      createLegend({
        content: {
          kind: LegendContentKind.Ramp,
          direction: LegendDirection.Horizontal,
          sample: leaf('sample', 100, 10, { exactAllocationWidth: 200 }),
          ticks: [{ key: 'middle', offset: 0.5, label: leaf('middle', 20, 4) }],
        },
      }),
    );

    expect(observed.allocationBounds.width).toBe(100);
    if (artifact.kind !== 'ramp') throw new Error('Expected ramp artifact');
    expect(artifact.ticks[0]?.anchor.x).toBe(50);
    expect(artifact.sample.slotBounds.width).toBe(100);
    expect(artifact.sample.allocationBounds.width).toBe(200);
    expect(artifact.sample.overflow.allocation.x).toBe(true);
    expect(artifact.bodyBounds.width).toBe(200);
  });
});
