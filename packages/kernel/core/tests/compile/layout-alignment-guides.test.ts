import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  IRChild,
  IRScene,
  LayoutAlignmentGuide,
  LayoutCompositeCompileContext,
} from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '../../src';

type MutableGuide = {
  name: string;
  dimension: 'x' | 'y';
  position: number;
};

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

const explicitGuideDefinition = (guides: ReadonlyArray<LayoutAlignmentGuide>) =>
  defineComposite({
    namespace: 'test',
    type: 'explicitGuides',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('explicitGuides'),
    }),
    compile: () => ({ children: [], alignmentGuides: guides }),
  });

const resolvedGuides = (context: LayoutCompositeCompileContext, child: IRChild) => {
  const probe = context.layoutChild(child, NaturalLayoutProposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result.alignmentGuides;
};

const probeGuidesOf = (
  child: IRChild,
  composites: ReadonlyArray<AnyCompositeDefinition> = [],
): ReadonlyArray<LayoutAlignmentGuide> | undefined => {
  let guides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  const inspector = defineComposite({
    namespace: 'test',
    type: 'guideInspector',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('guideInspector'),
    }),
    compile: (_node, context) => {
      guides = resolvedGuides(context, child);
      return { children: [] };
    },
  });

  compileToScene(sceneOf({ namespace: 'test', type: 'guideInspector' }), {
    composites: [...composites, inspector],
    padding: 0,
  });
  return guides;
};

const explicitGuideChild: IRChild = { namespace: 'test', type: 'explicitGuides' };

describe('layout alignment guide propagation', () => {
  it('applies translate only to the matching guide dimension and clip does not alter guides', () => {
    const explicit = explicitGuideDefinition([
      { name: 'column', dimension: 'x', position: 3 },
      { name: 'row', dimension: 'y', position: 4 },
    ]);

    expect(
      probeGuidesOf(
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 10, y: 20 }],
          clip: { kind: 'rect', x: -100, y: -100, width: 200, height: 200 },
          children: [explicitGuideChild],
        },
        [explicit],
      ),
    ).toEqual([
      { name: 'column', dimension: 'x', position: 13 },
      { name: 'row', dimension: 'y', position: 24 },
    ]);
  });

  it('applies a transform chain in the same reverse-list order as Core geometry', () => {
    const explicit = explicitGuideDefinition([{ name: 'column', dimension: 'x', position: 3 }]);

    expect(
      probeGuidesOf(
        {
          type: 'scope',
          transforms: [
            { kind: 'translate', x: 10, y: 0 },
            { kind: 'scale', x: 2 },
          ],
          children: [explicitGuideChild],
        },
        [explicit],
      ),
    ).toEqual([{ name: 'column', dimension: 'x', position: 16 }]);
  });

  it('applies positive and negative uniform or anisotropic scale per dimension', () => {
    const explicit = explicitGuideDefinition([
      { name: 'column', dimension: 'x', position: 3 },
      { name: 'row', dimension: 'y', position: 4 },
    ]);

    expect(
      probeGuidesOf(
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: -3 }],
          children: [explicitGuideChild],
        },
        [explicit],
      ),
    ).toEqual([
      { name: 'column', dimension: 'x', position: 6 },
      { name: 'row', dimension: 'y', position: -12 },
    ]);
    expect(
      probeGuidesOf(
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: -2 }],
          children: [explicitGuideChild],
        },
        [explicit],
      ),
    ).toEqual([
      { name: 'column', dimension: 'x', position: -6 },
      { name: 'row', dimension: 'y', position: -8 },
    ]);
  });

  it('omits only guides whose matching scale dimension is zero', () => {
    const explicit = explicitGuideDefinition([
      { name: 'column', dimension: 'x', position: 3 },
      { name: 'row', dimension: 'y', position: 4 },
    ]);

    expect(
      probeGuidesOf({ type: 'scope', transforms: [{ kind: 'scale', x: 2, y: 0 }], children: [explicitGuideChild] }, [
        explicit,
      ]),
    ).toEqual([{ name: 'column', dimension: 'x', position: 6 }]);
    expect(
      probeGuidesOf({ type: 'scope', transforms: [{ kind: 'scale', x: 0, y: 2 }], children: [explicitGuideChild] }, [
        explicit,
      ]),
    ).toEqual([{ name: 'row', dimension: 'y', position: 8 }]);
  });

  it('normalizes full-turn rotate to identity and never restores a guide after effective rotation', () => {
    const explicit = explicitGuideDefinition([{ name: 'row', dimension: 'y', position: 4 }]);

    expect(
      probeGuidesOf(
        {
          type: 'scope',
          transforms: [
            { kind: 'rotate', degrees: 720 },
            { kind: 'translate', x: 100, y: 3 },
          ],
          children: [explicitGuideChild],
        },
        [explicit],
      ),
    ).toEqual([{ name: 'row', dimension: 'y', position: 7 }]);
    expect(
      probeGuidesOf(
        {
          type: 'scope',
          transforms: [
            { kind: 'rotate', degrees: 90 },
            { kind: 'rotate', degrees: -90 },
            { kind: 'translate', x: 0, y: 3 },
          ],
          children: [explicitGuideChild],
        },
        [explicit],
      ),
    ).toBeUndefined();
  });
});

describe('layout alignment guide ownership', () => {
  it('propagates one unambiguous Structural Scope descendant and omits duplicate descendant keys', () => {
    const one = probeGuidesOf({
      type: 'scope',
      children: [
        { type: 'node', position: [0, 0], text: 'A', padding: 0, margin: 0 },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    });
    const duplicate = probeGuidesOf({
      type: 'scope',
      children: [
        { type: 'node', position: [0, 0], text: 'A', padding: 0, margin: 0 },
        { type: 'node', position: [20, 0], text: 'B', padding: 0, margin: 0 },
      ],
    });

    expect(one?.map(guide => guide.name)).toEqual(['first-baseline', 'last-baseline']);
    expect(duplicate).toBeUndefined();
  });

  it('exposes only explicit Composite guides and does not infer them from replay children', () => {
    const explicit = defineComposite({
      namespace: 'test',
      type: 'explicitContainer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('explicitContainer'),
      }),
      compile: (_node, context) => {
        const child = resolvedGuides(context, {
          type: 'node',
          position: [0, 0],
          text: 'A',
          padding: 0,
          margin: 0,
        });
        if (child === undefined) throw new Error('expected child baseline guides');
        const laid = context.layoutChild(
          { type: 'node', position: [0, 0], text: 'A', padding: 0, margin: 0 },
          NaturalLayoutProposal,
        );
        if (laid.kind === LayoutChildProbeKind.Failed) return context.raise(laid.failure);
        return {
          children: [context.replay(laid.result)],
          alignmentGuides: [{ name: 'container', dimension: 'x', position: 12 }],
        };
      },
    });
    const inferred = defineComposite({
      namespace: 'test',
      type: 'implicitContainer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('implicitContainer'),
      }),
      compile: (_node, context) => {
        const laid = context.layoutChild(
          { type: 'node', position: [0, 0], text: 'A', padding: 0, margin: 0 },
          NaturalLayoutProposal,
        );
        if (laid.kind === LayoutChildProbeKind.Failed) return context.raise(laid.failure);
        return { children: [context.replay(laid.result)] };
      },
    });

    expect(probeGuidesOf({ namespace: 'test', type: 'explicitContainer' }, [explicit])).toEqual([
      { name: 'container', dimension: 'x', position: 12 },
    ]);
    expect(probeGuidesOf({ namespace: 'test', type: 'implicitContainer' }, [inferred])).toBeUndefined();
  });

  it('validates duplicate and non-finite explicit guides', () => {
    const duplicate = explicitGuideDefinition([
      { name: 'same', dimension: 'x', position: 1 },
      { name: 'same', dimension: 'x', position: 2 },
    ]);
    const nonFinite = explicitGuideDefinition([{ name: 'bad', dimension: 'y', position: Number.POSITIVE_INFINITY }]);

    expect(() => probeGuidesOf(explicitGuideChild, [duplicate])).toThrow(/duplicate.*x.*same|x.*same.*duplicate/i);
    expect(() => probeGuidesOf(explicitGuideChild, [nonFinite])).toThrow(/guide.*position.*finite/i);
  });

  it('rejects sparse explicit guide arrays with an indexed diagnostic', () => {
    const sparse = new Array<LayoutAlignmentGuide>(1);
    const explicit = explicitGuideDefinition(sparse);

    expect(() => probeGuidesOf(explicitGuideChild, [explicit])).toThrow(/alignment guide at index 0/i);
  });

  it('reads every explicit guide field and array item once before validation and detaches it', () => {
    const fieldReads = new Map<PropertyKey, number>();
    const guardedGuide = new Proxy({ name: 'origin', dimension: 'x', position: 1 } as const, {
      get: (target, property, receiver) => {
        const count = (fieldReads.get(property) ?? 0) + 1;
        fieldReads.set(property, count);
        if (count > 1) throw new Error(`alignment guide field '${String(property)}' was read more than once`);
        return Reflect.get(target, property, receiver);
      },
    });
    const arrayReads = new Map<PropertyKey, number>();
    const guardedGuides = new Proxy([guardedGuide], {
      get: (target, property, receiver) => {
        const count = (arrayReads.get(property) ?? 0) + 1;
        arrayReads.set(property, count);
        if (count > 1) throw new Error(`alignment guide array '${String(property)}' was read more than once`);
        return Reflect.get(target, property, receiver);
      },
    });
    const explicit = explicitGuideDefinition(guardedGuides);

    expect(probeGuidesOf(explicitGuideChild, [explicit])).toEqual([{ name: 'origin', dimension: 'x', position: 1 }]);
    expect([...fieldReads.values()]).toEqual([...fieldReads.values()].map(() => 1));
    expect([...arrayReads.values()]).toEqual([...arrayReads.values()].map(() => 1));
  });

  it('detaches and freezes every result-facing guide occurrence while canonicalizing negative zero', () => {
    const sourceGuides: Array<MutableGuide> = [{ name: 'origin', dimension: 'x', position: -0 }];
    const explicit = explicitGuideDefinition(sourceGuides);
    let first: ReadonlyArray<LayoutAlignmentGuide> | undefined;
    let second: ReadonlyArray<LayoutAlignmentGuide> | undefined;
    let firstResult: ReturnType<LayoutCompositeCompileContext['layoutChild']> | undefined;
    const inspector = defineComposite({
      namespace: 'test',
      type: 'doubleInspector',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('doubleInspector'),
      }),
      compile: (_node, context) => {
        firstResult = context.layoutChild(explicitGuideChild, NaturalLayoutProposal);
        if (firstResult.kind === LayoutChildProbeKind.Failed) return context.raise(firstResult.failure);
        first = firstResult.result.alignmentGuides;
        second = resolvedGuides(context, explicitGuideChild);
        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'doubleInspector' }), {
      composites: [explicit, inspector],
      padding: 0,
    });
    sourceGuides[0].position = 99;

    expect(first).toEqual([{ name: 'origin', dimension: 'x', position: 0 }]);
    expect(Object.is(first?.[0].position, -0)).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.[0])).toBe(true);
    expect(Object.isFrozen(firstResult)).toBe(true);
    if (firstResult?.kind === LayoutChildProbeKind.Resolved) {
      expect(Object.isFrozen(firstResult.result)).toBe(true);
    }
    expect(first).not.toBe(second);
    expect(first?.[0]).not.toBe(second?.[0]);
  });
});
