import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { IRClip, IRScene } from '../../src';
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

const RecursiveClipDefinition = defineClip<RecursiveClip>({
  kind: 'recursive',
  schema: strictObject({ kind: literal('recursive'), params: strictObject({ depth: number().int().nonnegative() }) }),
  lower: (spec, context) =>
    spec.params.depth > 0
      ? context.lower({ kind: 'recursive', params: { depth: spec.params.depth - 1 } })
      : {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [10, 0] },
            { kind: 'line', to: [10, 10] },
            { kind: 'close' },
          ],
          fillRule: 'nonzero',
        },
});
const OperationCycleDefinition = defineClip({
  kind: 'operationCycle',
  schema: strictObject({ kind: literal('operationCycle'), params: strictObject({}) }),
  lower: (spec, context) => context.lower(spec),
});
describe('clip recursion guard', () => {
  it('shares the budget across siblings and permits a completed child to be reused', () => {
    const child: IRClip = { kind: 'recursive', params: { depth: 0 } };
    const pair = defineClip({
      kind: 'pair',
      schema: strictObject({ kind: literal('pair'), params: strictObject({}) }),
      lower: (_, context) => ({
        commands: [...context.lower(child).commands, ...context.lower(child).commands],
        fillRule: 'nonzero',
      }),
    });
    const scene = clippedIr({ kind: 'pair', params: {} });
    const clips = [pair, RecursiveClipDefinition];

    expect(compileToScene(scene, { clips, maxClipDepth: 3 }).scene.resources).toMatchObject([
      { kind: 'clip', path: { commands: expect.arrayContaining([{ kind: 'line', to: [10, 10] }]) } },
    ]);
    expect(() => compileToScene(scene, { clips, maxClipDepth: 2 })).toThrow(/maxClipDepth.*2/i);
  });

  it('counts each clip conversion once', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 2 } }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 3,
      }).scene.resources,
    ).toHaveLength(1);

    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 2 } }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 2,
      }),
    ).toThrow(/maxClipDepth.*2/i);
  });

  it('does not spend the budget again when a runtime Scope imports its prepared path', () => {
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
        maxClipDepth: 3,
      }).scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(scene, {
        clips: [RecursiveClipDefinition],
        composites: [runtimeScope],
        maxClipDepth: 2,
      }),
    ).toThrow(/maxClipDepth.*2/i);
  });

  it('uses a default budget of 32 clip conversions', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 31 } }), { clips: [RecursiveClipDefinition] })
        .scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 32 } }), { clips: [RecursiveClipDefinition] }),
    ).toThrow(/maxClipDepth.*32/i);
  });

  it('rejects an active operation object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'operationCycle', params: {} }), {
        clips: [OperationCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip/i);
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

      lower: () => {
        return { commands: [], fillRule: 'nonzero' };
      },
    });

    expect(() => compileToScene(clippedIr({ kind: 'malformed', params: {} }), { clips: [malformed] })).toThrow(
      RetikzCoreError,
    );
  });
});
