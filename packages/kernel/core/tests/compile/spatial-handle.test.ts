import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import type { IRChild, IRScene } from '../../src';

import { compileToScene, CompositeBaseSchema, defineComposite } from '../../src';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    id: string().optional(),
  }),
  expand: () => ({
    children: [],
    spatialHandles: [
      {
        key: 'body',
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
  expand: () => ({ children: [{ namespace: 'third', type: 'card', id: 'inner-card' }] }),
});

const sceneOf = (children: ReadonlyArray<IRChild>): IRScene => ({ version: 1, type: 'scene', children: [...children] });

describe('qualified spatial handle compile', () => {
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
      key: 'body',
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
      expand: () => ({
        children: [],
        spatialHandles: [
          { key: 'z', role: 'ordered', bounds: { x: 0, y: 0, width: 1, height: 1 } },
          { key: 'a', role: 'ordered', bounds: { x: 1, y: 0, width: 1, height: 1 } },
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

    expect(result.spatialHandles.entries.map(entry => entry.key)).toEqual(['z', 'a', 'z', 'a']);
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

  it('projects local rect through Scope placement exactly once', () => {
    const result = compileToScene(
      sceneOf([
        {
          type: 'scope',
          placement: { target: [100, 50] },
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
          context.scope({}, [], [{ key: 'layout', role: 'layout-card', bounds: { x: 2, y: 3, width: 4, height: 5 } }]),
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

  it('rejects layout result-level declarations at runtime', () => {
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'legacyLayoutCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('legacyLayoutCard'),
      }),
      compile: () =>
        ({
          children: [],
          spatialHandles: [{ key: 'legacy', role: 'legacy', bounds: { x: 0, y: 0, width: 1, height: 1 } }],
        }) as never,
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'legacyLayoutCard' }]), { composites: [layoutCard] }),
    ).toThrow(/unsupported.*spatialHandles/i);
  });

  it('rejects expand declarations combined with an owner-generated spatial Scope', () => {
    const scopedCard = defineComposite({
      namespace: 'third',
      type: 'scopedCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('scopedCard'),
      }),
      expand: () => ({
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 10, y: 20 }],
            children: [],
          },
        ],
        spatialHandles: [{ key: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } }],
      }),
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'scopedCard' }]), { composites: [scopedCard] }),
    ).toThrow(/spatial.*Scope|Scope.*spatial/i);
  });

  it('checks duplicate keys only across reachable runtime Scopes', () => {
    const declaration = { key: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } } as const;
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'reachableCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('reachableCard'),
      }),
      compile: (_node, context) => {
        void context.scope({}, [], [declaration]);
        return { children: [context.scope({}, [], [declaration])] };
      },
    });

    const result = compileToScene(sceneOf([{ namespace: 'third', type: 'reachableCard' }]), {
      composites: [layoutCard],
    });

    expect(result.spatialHandles.entries.map(entry => entry.key)).toEqual(['body']);
  });

  it('rejects duplicate keys across two reachable runtime Scopes', () => {
    const declaration = { key: 'body', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } } as const;
    const layoutCard = defineComposite({
      namespace: 'third',
      type: 'duplicateCard',
      schema: CompositeBaseSchema.extend({
        namespace: literal('third'),
        type: literal('duplicateCard'),
      }),
      compile: (_node, context) => ({
        children: [context.scope({}, [], [declaration]), context.scope({}, [], [declaration])],
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
        void context.scope({}, [], [{ key: '', role: 'card', bounds: { x: 0, y: 0, width: 1, height: 1 } }]);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'third', type: 'invalidDiscardedCard' }]), {
        composites: [layoutCard],
      }),
    ).toThrow(/key.*non-empty/i);
  });
});
