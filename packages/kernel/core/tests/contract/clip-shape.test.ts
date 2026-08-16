import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { AnyClipShapeDefinition, ClipShapeDefinition, PathClipShape, SceneClipPath } from '../../src';

import { defineClipShape } from '../../src';

const PathShapeSchema: z.ZodType<PathClipShape> = z.strictObject({
  kind: z.literal('path'),
  commands: z.array(
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('move'), to: z.tuple([z.number(), z.number()]) }),
      z.strictObject({ kind: z.literal('line'), to: z.tuple([z.number(), z.number()]) }),
    ]),
  ),
  fillRule: z.enum(['nonzero', 'evenodd']).optional(),
});

describe('ClipShape definition contract', () => {
  it.each(['', ' ', '\u2003', '\ufeff'])('rejects a blank shape kind (%j)', kind => {
    expect(() =>
      defineClipShape({
        kind,
        schema: z.strictObject({ kind: z.literal(kind) }),
        lower: (): SceneClipPath => ({
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [1, 1] },
          ],
          fillRule: 'nonzero',
        }),
      }),
    ).toThrowError('clip shape provider key must be a non-empty string.');
  });

  it('keeps one typed author boundary for builtin and custom shape definitions', () => {
    const definition = defineClipShape<PathClipShape>({
      kind: 'path',
      schema: PathShapeSchema,
      lower: shape => ({
        commands: shape.commands,
        fillRule: shape.fillRule ?? 'nonzero',
      }),
    });

    expectTypeOf(definition).toEqualTypeOf<ClipShapeDefinition<PathClipShape>>();
    const registryDefinitions: ReadonlyArray<AnyClipShapeDefinition> = [definition];
    expectTypeOf(registryDefinitions[0].lower).parameter(0).toBeNever();
    expect(definition.kind).toBe('path');
    expect(
      definition.lower(
        { kind: 'path', commands: [{ kind: 'move', to: [0, 0] }] },
        {
          round: value => value,
          lower: () => {
            throw new Error('not used by this contract test');
          },
        },
      ),
    ).toEqual({ commands: [{ kind: 'move', to: [0, 0] }], fillRule: 'nonzero' });
  });
});
