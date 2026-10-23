import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { ClipShape, IRClip, IRScene, PathCommand } from '../../src';
import { compileToScene, CompositeBaseSchema, defineClip, defineComposite, RetikzCoreError } from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

type RecursiveClip = {
  kind: 'recursive';
  /** 裁剪参数 */
  params: {
    depth: number;
  };
};

type RecursiveClipShape = ClipShape & {
  kind: 'recursive';
  /** 裁剪参数 */
  params: {
    commands: Array<PathCommand>;
  };
};

const RecursiveClipDefinition = defineClip<RecursiveClip, RecursiveClipShape>({
  kind: 'recursive',
  schema: strictObject({ kind: literal('recursive'), params: strictObject({ depth: number().int().nonnegative() }) }),
  resolve: (spec, context) => {
    if (spec.params.depth > 0)
      return context.resolve({ kind: 'recursive', params: { depth: spec.params.depth - 1 } }) as RecursiveClipShape;

    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
      { kind: 'close' },
    ];

    return { kind: 'recursive', params: { commands } };
  },
  lower: shape => ({ commands: shape.params.commands, fillRule: 'nonzero' }),
});

const OperationCycleDefinition = defineClip({
  kind: 'operationCycle',
  schema: strictObject({ kind: literal('operationCycle'), params: strictObject({}) }),
  resolve: (spec, context) => context.resolve(spec),
  lower: () => ({
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [1, 1] },
    ],
    fillRule: 'nonzero',
  }),
});

const LowerCycleDefinition = defineClip({
  kind: 'lowerCycle',
  schema: strictObject({ kind: literal('lowerCycle'), params: strictObject({}) }),
  resolve: () => ({ kind: 'lowerCycle', params: {} }),
  lower: (shape, context) => context.lower(shape),
});

describe('clip recursion guard', () => {
  it('shares the exact explicit budget across operation resolve and shape lower', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 2 } }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 4,
      }).scene.resources,
    ).toHaveLength(1);

    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 2 } }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 3,
      }),
    ).toThrow(/maxClipDepth.*3/i);
  });

  it('preserves the exact resolve budget when a runtime Scope imports its pre-resolved shape', () => {
    const runtimeScope = defineComposite({
      namespace: 'test',
      type: 'runtimeScopeClip',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('runtimeScopeClip'),
      }),
      compile: (_, context) => ({
        children: [
          context.createScope({ clip: { kind: 'recursive', params: { depth: 2 } } }, [
            { type: 'node', position: [0, 0], text: 'A' },
          ]),
        ],
      }),
    });
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'test', type: 'runtimeScopeClip' }],
    };

    expect(
      compileToScene(scene, {
        clips: [RecursiveClipDefinition],
        composites: [runtimeScope],
        maxClipDepth: 4,
      }).scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(scene, {
        clips: [RecursiveClipDefinition],
        composites: [runtimeScope],
        maxClipDepth: 3,
      }),
    ).toThrow(/maxClipDepth.*3/i);
  });

  it('uses a default budget of 32 edges', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 30 } }), { clips: [RecursiveClipDefinition] })
        .scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 31 } }), { clips: [RecursiveClipDefinition] }),
    ).toThrow(/maxClipDepth.*32/i);
  });

  it('rejects an active operation object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'operationCycle', params: {} }), {
        clips: [OperationCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip operation/i);
  });

  it('rejects an active lower object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'lowerCycle', params: {} }), {
        clips: [LowerCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip shape/i);
  });
});

describe('clip failure boundaries', () => {
  it('reports missing definitions with available registry keys', () => {
    expect(() => compileToScene(clippedIr({ kind: 'missingOperation', params: {} }))).toThrow(
      /Unknown provider .*available: rect/i,
    );
  });

  it('keeps malformed lower output as a fatal provider contract error', () => {
    const malformed = defineClip({
      kind: 'malformed',
      schema: strictObject({ kind: literal('malformed'), params: strictObject({}) }),
      resolve: () => ({ kind: 'malformed', params: {} }),
      lower: () => ({ commands: [], fillRule: 'nonzero' }),
    });

    expect(() => compileToScene(clippedIr({ kind: 'malformed', params: {} }), { clips: [malformed] })).toThrow(
      RetikzCoreError,
    );
  });
});
