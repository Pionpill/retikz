import { describe, expect, it } from 'vitest';
import { array, literal, number, strictObject } from 'zod';

import type { ClipShape, IRClip, IRScene, PathCommand } from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineClip,
  defineComposite,
  PathCommandSchema,
  RetikzCoreError,
} from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

type RecursiveClip = {
  kind: 'recursive';
  depth: number;
};

type RecursiveClipShape = ClipShape & {
  kind: 'recursive';
  commands: Array<PathCommand>;
};

const RecursiveClipDefinition = defineClip<RecursiveClip, RecursiveClipShape>({
  kind: 'recursive',
  schema: strictObject({ kind: literal('recursive'), depth: number().int().nonnegative() }),
  resolve: (spec, context) => {
    if (spec.depth > 0) return context.resolve({ kind: 'recursive', depth: spec.depth - 1 }) as RecursiveClipShape;
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
      { kind: 'close' },
    ];
    return { kind: 'recursive', commands };
  },
  shapeSchema: strictObject({ kind: literal('recursive'), commands: array(PathCommandSchema) }),
  lower: shape => ({ commands: shape.commands, fillRule: 'nonzero' }),
});

const OperationCycleDefinition = defineClip({
  kind: 'operationCycle',
  schema: strictObject({ kind: literal('operationCycle') }),
  resolve: (spec, context) => context.resolve(spec),
  shapeSchema: strictObject({ kind: literal('operationCycle') }),
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
  schema: strictObject({ kind: literal('lowerCycle') }),
  resolve: () => ({ kind: 'lowerCycle' }),
  shapeSchema: strictObject({ kind: literal('lowerCycle') }),
  lower: (shape, context) => context.lower(shape),
});

describe('clip recursion guard', () => {
  it('shares the exact explicit budget across operation resolve and shape lower', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', depth: 2 }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 4,
      }).scene.resources,
    ).toHaveLength(1);

    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', depth: 2 }), {
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
          context.scope({ clip: { kind: 'recursive', depth: 2 } }, [{ type: 'node', position: [0, 0], text: 'A' }]),
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
      compileToScene(clippedIr({ kind: 'recursive', depth: 30 }), { clips: [RecursiveClipDefinition] }).scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', depth: 31 }), { clips: [RecursiveClipDefinition] }),
    ).toThrow(/maxClipDepth.*32/i);
  });

  it('rejects an active operation object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'operationCycle' }), {
        clips: [OperationCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip operation/i);
  });

  it('rejects an active lower object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'lowerCycle' }), {
        clips: [LowerCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip shape/i);
  });
});

describe('clip failure boundaries', () => {
  it('points every missing definition to options.clips', () => {
    expect(() => compileToScene(clippedIr({ kind: 'missingOperation' }))).toThrow(/options\.clips/i);
  });

  it('keeps malformed lower output as a fatal provider contract error', () => {
    const malformed = defineClip({
      kind: 'malformed',
      schema: strictObject({ kind: literal('malformed') }),
      resolve: () => ({ kind: 'malformed' }),
      shapeSchema: strictObject({ kind: literal('malformed') }),
      lower: () => ({ commands: [], fillRule: 'nonzero' }),
    });

    expect(() => compileToScene(clippedIr({ kind: 'malformed' }), { clips: [malformed] })).toThrow(RetikzCoreError);
  });
});
