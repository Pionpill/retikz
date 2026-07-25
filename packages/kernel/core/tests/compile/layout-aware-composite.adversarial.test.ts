import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileWarning, CompositeReplay, IRChild, IRScene, JsonValue, TextMeasurer } from '../../src';

import {
  ChildSchema,
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  lowerIRToKernel,
} from '../../src';
import { cloneAndFreezeJson } from '../../src/compile/orchestration/artifact';
import { arrowMarks } from '../helpers/arrow-marks';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const BoundsSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const sceneOf = (...children: Array<IRChild>): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const createBoundsProbe = () =>
  defineComposite({
    namespace: 'test',
    type: 'boundsProbe',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('boundsProbe'),
      child: ChildSchema,
      maxWidth: z.number().optional(),
    }),
    artifactSchema: z.strictObject({
      allocation: BoundsSchema,
      visual: BoundsSchema,
    }),
    compile: (node, { layoutChild }) => {
      const laid = layoutChild(
        node.child,
        node.maxWidth === undefined ? { kind: 'intrinsic' } : { kind: 'constrained', maxWidth: node.maxWidth },
      );
      return {
        children: [{ kind: 'replay', replay: laid.replay }],
        artifact: {
          allocation: laid.allocationBounds,
          visual: laid.visualBounds,
        },
      };
    },
  });

describe('layout-aware composite constraints and bounds', () => {
  it('keeps margin in allocation while visual bounds follow paint and shadow', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        child: {
          type: 'node',
          position: [0, 0],
          minimumSize: { width: 20, height: 10 },
          padding: 0,
          margin: 5,
          fill: '#f00',
          stroke: '#000',
          strokeOpacity: 0,
          shadow: {
            offsetX: 10,
            offsetY: -8,
            blur: 2,
            color: '#000',
          },
        },
      }),
      { composites: [definition], padding: 0 },
    );

    expect(result.artifacts[0]?.value).toEqual({
      allocation: { x: -15, y: -10, width: 30, height: 20 },
      visual: { x: -12, y: -15, width: 34, height: 22 },
    });
  });

  it('treats maxWidth as a reflow upper bound without scaling fixed geometry', () => {
    const definition = createBoundsProbe();
    const pathResult = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        maxWidth: 20,
        child: {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      }),
      { composites: [definition] },
    );
    const emptyTextResult = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        maxWidth: 0,
        child: {
          type: 'node',
          position: [0, 0],
          text: '',
          padding: 0,
          margin: 0,
          fillOpacity: 0,
          strokeOpacity: 0,
        },
      }),
      { composites: [definition], measureText: fixedMeasurer, padding: 0 },
    );

    expect(pathResult.artifacts[0]?.value).toMatchObject({
      allocation: { x: 0, y: 0, width: 100, height: 0 },
    });
    expect(emptyTextResult.artifacts[0]?.value).toMatchObject({
      allocation: { width: 0 },
      visual: { width: 0 },
    });
  });

  it('lays out Coordinate, Scope, and empty output with finite bounds', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf(
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: { type: 'coordinate', id: 'point', position: [3, 4] },
        },
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: {
            type: 'scope',
            children: [
              {
                type: 'node',
                position: [10, 20],
                minimumSize: 10,
                padding: 0,
                margin: 0,
                fill: '#f00',
                strokeOpacity: 0,
              },
            ],
          },
        },
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: { type: 'scope', children: [] },
        },
      ),
      { composites: [definition], padding: 0 },
    );

    expect(result.artifacts.map(artifact => artifact.value)).toMatchObject([
      {
        allocation: { x: 3, y: 4, width: 0, height: 0 },
        visual: { x: 0, y: 0, width: 0, height: 0 },
      },
      {
        allocation: { x: 5, y: 15, width: 10, height: 10 },
        visual: { x: 5, y: 15, width: 10, height: 10 },
      },
      {
        allocation: { x: 0, y: 0, width: 0, height: 0 },
        visual: { x: 0, y: 0, width: 0, height: 0 },
      },
    ]);
  });

  it('passes constrained layout through nested layout-aware composites', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedConstraint'),
      }),
      artifactSchema: z.strictObject({ maxWidth: z.number() }),
      compile: (_, { constraint }) => ({
        children: [],
        artifact: {
          maxWidth: constraint.kind === 'constrained' ? constraint.maxWidth : -1,
        },
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'constraintParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('constraintParent'),
      }),
      compile: (_, { layoutChild }) => {
        const child = layoutChild(
          { namespace: 'test', type: 'nestedConstraint' },
          { kind: 'constrained', maxWidth: 25 },
        );
        return { children: [{ kind: 'replay', replay: child.replay }] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'constraintParent' }), {
      composites: [nested, parent],
    });

    expect(result.artifacts).toMatchObject([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'nestedConstraint',
        value: { maxWidth: 25 },
      },
    ]);
  });

  it('keeps arrow marker paint outside path allocation but inside visual bounds', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        child: {
          type: 'path',
          marks: arrowMarks('->'),
          lineJoin: 'bevel',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      }),
      { composites: [definition], measureText: fixedMeasurer },
    );
    const artifact = result.artifacts[0];

    expect(artifact.value).toMatchObject({
      allocation: { x: 0, y: 0, width: 100, height: 0 },
    });
    if (artifact.kind !== 'composite') {
      throw new Error('Expected bounds artifact');
    }
    const { allocation, visual } = artifact.value;
    expect(visual.x).toBeLessThan(allocation.x);
    expect(visual.x + visual.width).toBeGreaterThanOrEqual(allocation.x + allocation.width);
    expect(visual.height).toBeGreaterThan(1);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'reports invalid maxWidth %s with the composite key and occurrence',
    maxWidth => {
      const definition = defineComposite({
        namespace: 'test',
        type: 'invalidConstraint',
        schema: CompositeBaseSchema.extend({
          namespace: z.literal('test'),
          type: z.literal('invalidConstraint'),
        }),
        compile: (_, { layoutChild }) => {
          layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, { kind: 'constrained', maxWidth });
          return { children: [] };
        },
      });

      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: 'invalidConstraint' }), {
          composites: [definition],
        }),
      ).toThrow(/test\.invalidConstraint.*children\[0\]/i);
    },
  );

  it.each([
    { kind: 'intrinsic', maxWidth: 10 },
    { kind: 'constrained', maxWidth: 10, minWidth: 5 },
  ])('rejects unsupported layout constraint fields in %o', constraint => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'unsupportedConstraintField',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unsupportedConstraintField'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, constraint as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unsupportedConstraintField' }), { composites: [definition] }),
    ).toThrow(/test\.unsupportedConstraintField.*children\[0\].*constraint/i);
  });

  it('rejects unknown layout constraint kinds', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'unknownConstraintKind',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unknownConstraintKind'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, { kind: 'mystery', maxWidth: 10 } as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unknownConstraintKind' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.unknownConstraintKind.*children\[0\].*invalid constraint kind.*mystery/i);
  });

  it('fails loudly when layoutChild depends on a later external reference', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'forwardReference',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('forwardReference'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild(
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { id: 'later' } },
            ],
          },
          { kind: 'intrinsic' },
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(
        sceneOf(
          { namespace: 'test', type: 'forwardReference' },
          { type: 'node', id: 'later', position: [20, 20], minimumSize: 10 },
        ),
        { composites: [definition] },
      ),
    ).toThrow(/later|reference|not found|unresolved/i);
  });
});

describe('layout-aware composite replay ownership', () => {
  it('publishes one duplicate-id warning and commits replay last-wins', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateReplayId',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('duplicateReplayId'),
      }),
      compile: (_, { layoutChild }) => {
        const replay = layoutChild({ type: 'coordinate', id: 'same', position: [20, 0] }, { kind: 'intrinsic' }).replay;
        return { children: [{ kind: 'replay', replay }] };
      },
    });
    const warnings: Array<CompileWarning> = [];

    const result = compileToScene(
      sceneOf(
        { type: 'coordinate', id: 'same', position: [0, 0] },
        { namespace: 'test', type: 'duplicateReplayId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, -10] },
            { type: 'step', kind: 'line', to: { id: 'same' } },
          ],
        },
      ),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(1);
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    expect(path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined).toMatchObject({
      to: [20, 0],
    });
  });

  it('still reports an id introduced by raw output before replay commit', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'rawBeforeReplayId',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('rawBeforeReplayId'),
      }),
      compile: (_, { layoutChild }) => {
        const replay = layoutChild({ type: 'coordinate', id: 'same', position: [20, 0] }, { kind: 'intrinsic' }).replay;
        return {
          children: [
            { type: 'coordinate', id: 'same', position: [10, 0] },
            { kind: 'replay', replay },
          ],
        };
      },
    });
    const warnings: Array<CompileWarning> = [];

    const result = compileToScene(
      sceneOf(
        { namespace: 'test', type: 'rawBeforeReplayId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, -10] },
            { type: 'step', kind: 'line', to: { id: 'same' } },
          ],
        },
      ),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(1);
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    expect(path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined).toMatchObject({
      to: [20, 0],
    });
  });

  it('preserves replay root zIndex when mixed with raw output', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'mixedZIndex',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('mixedZIndex'),
      }),
      compile: (_, { layoutChild }) => {
        const replay = layoutChild({ type: 'node', position: [0, 0], zIndex: 10 }, { kind: 'intrinsic' }).replay;
        return {
          children: [
            { kind: 'replay', replay },
            {
              type: 'path',
              zIndex: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'mixedZIndex' }), {
      composites: [definition],
    });

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['path', 'rect']);
  });

  it('preserves replay root zIndex through placement transforms', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'transformedZIndex',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('transformedZIndex'),
      }),
      compile: (_, { layoutChild }) => {
        const replay = layoutChild({ type: 'node', position: [0, 0], zIndex: 10 }, { kind: 'intrinsic' }).replay;
        return {
          children: [
            {
              kind: 'replay',
              replay,
              transforms: [{ kind: 'translate', x: 10, y: 0 }],
            },
            {
              type: 'path',
              zIndex: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'transformedZIndex' }), {
      composites: [definition],
    });

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['path', 'group']);
  });

  it('rejects a replay token retained from a previous compile', () => {
    let retained: CompositeReplay | undefined;
    let reuse = false;
    const definition = defineComposite({
      namespace: 'test',
      type: 'retainedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('retainedReplay'),
      }),
      compile: (_, { layoutChild }) => {
        if (reuse) {
          return { children: [{ kind: 'replay', replay: retained! }] };
        }
        retained = layoutChild({ type: 'node', position: [0, 0], text: 'first' }, { kind: 'intrinsic' }).replay;
        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'retainedReplay' }), {
      composites: [definition],
    });
    reuse = true;
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'retainedReplay' }), {
        composites: [definition],
      }),
    ).toThrow(/does not belong to this compile|forged/i);
  });

  it('rejects a structurally forged replay token', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'forgedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('forgedReplay'),
      }),
      compile: () => ({
        children: [
          {
            kind: 'replay',
            replay: Object.freeze({}) as CompositeReplay,
          },
        ],
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'forgedReplay' }), {
        composites: [definition],
      }),
    ).toThrow(/does not belong to this compile|forged/i);
  });

  it('applies replay transforms to allocation, Scene, namespace, and Node artifacts', () => {
    const moved = defineComposite({
      namespace: 'test',
      type: 'moved',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('moved'),
      }),
      compile: (_, { layoutChild }) => {
        const child = layoutChild(
          {
            type: 'node',
            id: 'moved-node',
            position: [0, 0],
            minimumSize: 10,
            padding: 0,
            margin: 0,
          },
          { kind: 'intrinsic' },
        );
        return {
          children: [
            {
              kind: 'replay',
              replay: child.replay,
              transforms: [{ kind: 'translate', x: 20, y: 30 }],
            },
          ],
        };
      },
    });
    const outer = defineComposite({
      namespace: 'test',
      type: 'outer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('outer'),
      }),
      artifactSchema: BoundsSchema,
      compile: (_, { layoutChild }) => {
        const child = layoutChild({ namespace: 'test', type: 'moved' }, { kind: 'intrinsic' });
        return {
          children: [{ kind: 'replay', replay: child.replay }],
          artifact: child.allocationBounds,
        };
      },
    });
    const result = compileToScene(
      sceneOf(
        { namespace: 'test', type: 'outer' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'moved-node' } },
          ],
        },
      ),
      {
        composites: [moved, outer],
        artifacts: { nodeLayouts: true },
        padding: 0,
      },
    );

    expect(result.artifacts[0]?.value).toEqual({
      x: 15,
      y: 25,
      width: 10,
      height: 10,
    });
    expect(result.artifacts).toContainEqual(
      expect.objectContaining({
        kind: 'nodeLayout',
        value: expect.objectContaining({
          id: 'moved-node',
          rect: expect.objectContaining({ x: 20, y: 30 }),
        }),
      }),
    );
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });
});

describe('layout-aware composite artifacts and lowering errors', () => {
  it('requires exactly one expand or compile branch at runtime', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('invalidBranch'),
    });

    expect(() =>
      defineComposite({
        namespace: 'test',
        type: 'invalidBranch',
        schema,
        expand: () => [],
        compile: () => ({ children: [] }),
      } as never),
    ).toThrow(/exactly one of expand or compile/i);
    expect(() =>
      defineComposite({
        namespace: 'test',
        type: 'invalidBranch',
        schema,
      } as never),
    ).toThrow(/exactly one of expand or compile/i);
  });

  it('rejects artifacts without a schema and schema-mismatched payloads', () => {
    const missingSchema = defineComposite({
      namespace: 'test',
      type: 'missingArtifactSchema',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('missingArtifactSchema'),
      }),
      compile: () => ({ children: [], artifact: { leaked: true } }) as never,
    });
    const mismatched = defineComposite({
      namespace: 'test',
      type: 'mismatchedArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('mismatchedArtifact'),
      }),
      artifactSchema: z.strictObject({ count: z.number() }),
      compile: () => ({
        children: [],
        artifact: { count: 'not-a-number' as unknown as number },
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'missingArtifactSchema' }), {
        composites: [missingSchema],
      }),
    ).toThrow(/artifactSchema/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'mismatchedArtifact' }), {
        composites: [mismatched],
      }),
    ).toThrow();
  });

  it('applies maxCompositeDepth to the layout-aware compile branch', () => {
    const recursive = defineComposite({
      namespace: 'test',
      type: 'recursive',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('recursive'),
      }),
      compile: () => ({
        children: [{ namespace: 'test', type: 'recursive' }],
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'recursive' }), {
        composites: [recursive],
        maxCompositeDepth: 2,
      }),
    ).toThrow(/COMPOSITE_NEST_TOO_DEEP.*children\[0\]/);
  });

  it('rejects schema-accepted values that are not JSON-safe plain data', () => {
    const unsafeSchema = z.custom<JsonValue>(() => true);
    const definition = defineComposite({
      namespace: 'test',
      type: 'unsafeArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unsafeArtifact'),
      }),
      artifactSchema: unsafeSchema,
      compile: () => ({
        children: [],
        artifact: new Map([['hidden', true]]) as unknown as JsonValue,
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unsafeArtifact' }), {
        composites: [definition],
      }),
    ).toThrow(/plain objects and arrays/i);
  });

  it('preserves JSON special keys in detached artifacts', () => {
    const payload = JSON.parse('{"__proto__":{"safe":true}}') as JsonValue;
    const definition = defineComposite({
      namespace: 'test',
      type: 'specialArtifactKeys',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('specialArtifactKeys'),
      }),
      artifactSchema: z.custom<JsonValue>(),
      compile: () => ({ children: [], artifact: payload }),
    });

    const artifact = compileToScene(sceneOf({ namespace: 'test', type: 'specialArtifactKeys' }), {
      composites: [definition],
    }).artifacts[0];

    expect(artifact.kind).toBe('composite');
    expect(Object.hasOwn(artifact.value as object, '__proto__')).toBe(true);
    expect(JSON.stringify(artifact.value)).toBe('{"__proto__":{"safe":true}}');
  });

  it('rejects symbol-keyed artifact properties instead of silently dropping them', () => {
    const payload = { visible: true, [Symbol('hidden')]: 'not-json' } as unknown as JsonValue;
    const definition = defineComposite({
      namespace: 'test',
      type: 'symbolArtifactKey',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('symbolArtifactKey'),
      }),
      artifactSchema: z.custom<JsonValue>(),
      compile: () => ({ children: [], artifact: payload }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'symbolArtifactKey' }), {
        composites: [definition],
      }),
    ).toThrow(/symbol key/i);
  });

  it('rejects functions, sets, class instances, symbols, and cyclic artifact data', () => {
    class ArtifactClass {
      value = true;
    }
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const values: Array<unknown> = [
      { callback: () => undefined },
      new Set(['hidden']),
      new ArtifactClass(),
      { value: Symbol('hidden') },
      cyclic,
    ];

    for (const value of values) {
      expect(() => cloneAndFreezeJson(value)).toThrow();
    }
  });

  it('rejects a layout-aware composite produced by an expand branch', () => {
    const layout = defineComposite({
      namespace: 'test',
      type: 'layoutOnly',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('layoutOnly'),
      }),
      compile: () => ({ children: [] }),
    });
    const expand = defineComposite({
      namespace: 'test',
      type: 'expandToLayout',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('expandToLayout'),
      }),
      expand: () => ({ namespace: 'test', type: 'layoutOnly' }),
    });

    expect(() =>
      lowerIRToKernel(sceneOf({ namespace: 'test', type: 'expandToLayout' }), {
        composites: [expand, layout],
      }),
    ).toThrow(/test\.layoutOnly.*children\[0\].*full compile environment/i);
  });
});
