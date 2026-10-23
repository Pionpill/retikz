import { describe, expect, it } from 'vitest';
import { literal, string, strictObject } from 'zod';

import type { IRChild, IRScene, IRScopePosition } from '../../src';
import { compileToScene, CompositeBaseSchema, defineComposite, ScopeSchema, NaturalLayoutProposal } from '../../src';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    id: string().optional(),
  }),
  compile: () => ({
    children: [],
    spatialHandles: [
      {
        id: 'body',
        role: 'card',
        bounds: { x: 0, y: 0, width: 10, height: 20 },
        tags: ['content', 'primary'],
        payload: { domainId: 'a' },
      },
    ],
  }),
});

const panel = defineComposite({
  namespace: 'third',
  type: 'panel',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('panel'),
    id: string().optional(),
  }),
  compile: () => ({ children: [{ namespace: 'third', type: 'card', id: 'inner-card' }] }),
});

const sceneOf = (children: ReadonlyArray<IRChild>): IRScene => ({ version: 1, type: 'scene', children: [...children] });

describe('qualified spatial handle compile', () => {
  it('commits direct spatial declarations and artifacts only for the selected probe', () => {
    const measured = defineComposite({
      namespace: 'third',
      type: 'measured',
      schema: CompositeBaseSchema.extend({ namespace: literal('third'), type: literal('measured') }),
      artifactSchema: strictObject({ selected: literal(true) }),
      compile: () => ({
        children: [],
        artifact: { selected: true },
        spatialHandles: [{ id: 'body', role: 'card', bounds: { x: 0, y: 0, width: 10, height: 20 } }],
      }),
    });
    const container = defineComposite({
      namespace: 'third',
      type: 'container',
      schema: CompositeBaseSchema.extend({ namespace: literal('third'), type: literal('container') }),
      compile: (_node, context) => {
        context.layoutChild({ namespace: 'third', type: 'measured' }, NaturalLayoutProposal);
        const selected = context.layoutChild({ namespace: 'third', type: 'measured' }, NaturalLayoutProposal);
        if (selected.kind === 'failed') return context.raise(selected.failure);
        return { children: [context.replay(selected.result, { transforms: [{ kind: 'translate', x: 30, y: 40 }] })] };
      },
    });
    const result = compileToScene(sceneOf([{ namespace: 'third', type: 'container' }]), {
      composites: [container, measured],
    });
    expect(result.spatialHandles.entries).toHaveLength(1);
    expect(result.spatialHandles.entries[0]).toMatchObject({
      id: 'body',
      geometry: { kind: 'rect', bounds: { x: 30, y: 40, width: 10, height: 20 } },
      ownerPath: [
        { namespace: 'third', type: 'container' },
        { namespace: 'third', type: 'measured' },
      ],
    });
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]).toMatchObject({
      value: { selected: true },
      occurrence: {
        sourcePath: 'children[0]',
        expansionPath: [{ kind: 'replay', index: 0 }],
      },
    });
  });

  it('returns one frozen empty index when no composite declares handles', () => {
    const result = compileToScene(sceneOf([]));

    expect(result.spatialHandles).toEqual({ entries: [] });
    expect(Object.isFrozen(result.spatialHandles)).toBe(true);
    expect(Object.isFrozen(result.spatialHandles.entries)).toBe(true);
  });

  it('qualifies nested owners without copying or renaming the descendant declaration', () => {
    const result = compileToScene(sceneOf([{ namespace: 'third', type: 'panel', id: 'outer-panel' }]), {
      composites: [panel, card],
    });

    expect(result.scene).not.toHaveProperty('spatialHandles');
    expect(JSON.stringify(result.scene)).not.toContain('domainId');
    expect(result.spatialHandles.entries).toHaveLength(1);
    expect(result.spatialHandles.entries[0]).toMatchObject({
      ownerPath: [
        { namespace: 'third', type: 'panel', instanceId: 'outer-panel' },
        { namespace: 'third', type: 'card', instanceId: 'inner-card' },
      ],
      id: 'body',
      role: 'card',
      geometry: { kind: 'rect', bounds: { x: 0, y: 0, width: 10, height: 20 } },
      tags: ['content', 'primary'],
      payload: { domainId: 'a' },
    });
    expect(JSON.parse(JSON.stringify(result.spatialHandles))).toEqual(result.spatialHandles);
  });

  it('preserves traversal and authored declaration order while keeping anonymous owners occurrence-only', () => {
    const orderedCard = defineComposite({
      namespace: 'third',
      type: 'orderedCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('orderedCard'),
        id: string().optional(),
      }),
      compile: () => ({
        children: [],
        spatialHandles: [
          { id: 'z', role: 'ordered', bounds: { x: 0, y: 0, width: 1, height: 1 } },
          { id: 'a', role: 'ordered', bounds: { x: 1, y: 0, width: 1, height: 1 } },
        ],
      }),
    });
    const result = compileToScene(
      sceneOf([
        { namespace: 'third', type: 'orderedCard' },
        { namespace: 'third', type: 'orderedCard', id: 'second' },
      ]),
      { composites: [orderedCard] },
    );

    expect(result.spatialHandles.entries.map(entry => entry.id)).toEqual(['z', 'a', 'z', 'a']);
    expect(result.spatialHandles.entries.map(entry => entry.ownerPath.at(-1)?.instanceId)).toEqual([
      undefined,
      undefined,
      'second',
      'second',
    ]);
    expect(result.spatialHandles.entries[0]?.ownerPath.at(-1)?.occurrence).not.toEqual(
      result.spatialHandles.entries[2]?.ownerPath.at(-1)?.occurrence,
    );
  });

  it.each([
    {
      label: 'translate',
      transforms: [{ kind: 'translate' as const, x: 7, y: -3 }],
      bounds: { x: 7, y: -3, width: 10, height: 20 },
    },
    {
      label: 'scale',
      transforms: [{ kind: 'scale' as const, x: 2, y: 3 }],
      bounds: { x: 0, y: 0, width: 20, height: 60 },
    },
    {
      label: 'rotate',
      transforms: [{ kind: 'rotate' as const, degrees: 90 }],
      bounds: { x: -20, y: 0, width: 20, height: 10 },
    },
  ])('projects local rect through one $label transform exactly once', ({ transforms, bounds }) => {
    const result = compileToScene(
      sceneOf([{ type: 'scope', transforms, children: [{ namespace: 'third', type: 'card' }] }]),
      { composites: [card] },
    );

    expect(result.spatialHandles.entries[0]?.geometry.bounds).toEqual(bounds);
  });

  it('projects local rect through Scope anchor position exactly once', () => {
    const result = compileToScene(
      sceneOf([
        {
          type: 'scope',
          position: { kind: 'anchor', target: [100, 50] },
          children: [{ namespace: 'third', type: 'card' }],
        },
      ]),
      { composites: [card] },
    );

    expect(result.spatialHandles.entries[0]?.geometry.bounds).toEqual({
      x: 100,
      y: 50,
      width: 10,
      height: 20,
    });
  });

  it('accepts declarations attached to a layout-aware runtime Scope', () => {
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'layoutCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('layoutCard'),
      }),
      compile: (_node, context) => ({
        children: [
          context.createScope(
            {},
            [],
            [{ id: 'layout', role: 'layout-card', bounds: { x: 2, y: 3, width: 4, height: 5 } }],
          ),
        ],
      }),
    });
    const result = compileToScene(
      sceneOf([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 10, y: 20 }],
          children: [{ namespace: 'third', type: 'layoutCard' }],
        },
      ]),
      { composites: [layoutCard] },
    );

    expect(result.spatialHandles.entries[0]?.geometry.bounds).toEqual({ x: 12, y: 23, width: 4, height: 5 });
  });

  it('rejects direct declarations combined with an owner-generated spatial Scope', () => {
    const scopedCard = defineComposite({
      namespace: 'third',
      type: 'scopedCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('scopedCard'),
      }),
      compile: () => ({
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 10, y: 20 }],
            children: [],
          },
        ],
        spatialHandles: [{ id: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } }],
      }),
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'scopedCard' }]), { composites: [scopedCard] }),
    ).toThrow(/spatial.*Scope|Scope.*spatial/i);
  });

  it.each<{ position: IRScopePosition; accepted: boolean }>([
    { position: [0, 0], accepted: true },
    { position: [10, 20], accepted: false },
    { position: { kind: 'anchor', target: [0, 0] }, accepted: false },
  ])('result-level handles distinguish zero from spatial Scope position: $position', ({ position, accepted }) => {
    const positionedCard = defineComposite({
      namespace: 'third',
      type: 'positionedCard',
      schema: CompositeBaseSchema.extend({ namespace: literal('third'), type: literal('positionedCard') }),
      compile: () => ({
        children: [ScopeSchema.parse({ type: 'scope', position, children: [] })],
        spatialHandles: [{ id: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } }],
      }),
    });
    const run = () =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'positionedCard' }]), { composites: [positionedCard] });
    if (accepted) expect(run().spatialHandles.entries).toHaveLength(1);
    else expect(run).toThrow(/spatial.*Scope|Scope.*spatial/i);
  });

  it('checks duplicate keys only across reachable runtime Scopes', () => {
    const declaration = { id: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } } as const;
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'reachableCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('reachableCard'),
      }),
      compile: (_node, context) => {
        void context.createScope({}, [], [declaration]);
        return { children: [context.createScope({}, [], [declaration])] };
      },
    });

    const result = compileToScene(sceneOf([{ namespace: 'third', type: 'reachableCard' }]), {
      composites: [layoutCard],
    });

    expect(result.spatialHandles.entries.map(entry => entry.id)).toEqual(['body']);
  });

  it('rejects duplicate alias ids across two reachable runtime Scopes', () => {
    const declaration = { id: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } } as const;
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'duplicateCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('duplicateCard'),
      }),
      compile: (_node, context) => ({
        children: [
          context.createScope({}, [], [declaration]),
          context.createScope({}, [], [{ ...declaration, id: 'other', aliasIds: ['body'] }]),
        ],
      }),
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'duplicateCard' }]), { composites: [layoutCard] }),
    ).toThrow(/duplicate.*body/i);
  });

  it('validates declarations when a runtime Scope is created even if it is discarded', () => {
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'invalidDiscardedCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('invalidDiscardedCard'),
      }),
      compile: (_node, context) => {
        void context.createScope({}, [], [{ id: 'body', role: 'card', bounds: { x: 0, y: 0, width: -1, height: 1 } }]);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'invalidDiscardedCard' }]), {
        composites: [layoutCard],
      }),
    ).toThrow(/width.*nonnegative/i);
  });
});
