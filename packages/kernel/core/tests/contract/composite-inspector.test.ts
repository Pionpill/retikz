import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { AnyCompositeDefinition, CompositeInspectorDefinition } from '../../src';

import { CompositeBaseSchema, defineComposite } from '../../src';

const schema = (type: string) =>
  CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal(type),
  });

describe('composite inspector definition', () => {
  it('preserves exact artifact and resolved local option callback types', () => {
    const localInput = z.strictObject({ tracks: z.boolean().optional() });
    const localResolved = localInput.transform(value => ({ tracks: value.tracks ?? true }));
    const inspector = {
      kind: 'layout',
      localOptionsInputSchema: localInput,
      localOptionsSchema: localResolved,
      inspect: (artifact: { value: number }, context: { options: { tracks: boolean } }) => {
        expectTypeOf(artifact.value).toEqualTypeOf<number>();
        expectTypeOf(context.options.tracks).toEqualTypeOf<boolean>();
        return [];
      },
    } satisfies CompositeInspectorDefinition<
      { value: number },
      { tracks: z.ZodOptional<z.ZodBoolean> },
      { tracks: boolean }
    >;
    const definition = defineComposite({
      namespace: 'test',
      type: 'validInspector',
      schema: schema('validInspector'),
      artifactSchema: z.strictObject({ value: z.number() }),
      inspector,
      compile: () => ({ children: [], artifact: { value: 1 } }),
    });

    expect(definition.inspector).toBe(inspector);
    expectTypeOf(definition).toMatchTypeOf<AnyCompositeDefinition>();
  });

  it('rejects inspector branches without a compile artifact', () => {
    const inspector = {
      kind: 'layout',
      localOptionsInputSchema: z.strictObject({}),
      localOptionsSchema: z.strictObject({}),
      inspect: () => [],
    };
    expect(() =>
      defineComposite({
        namespace: 'test',
        type: 'expandInspector',
        schema: schema('expandInspector'),
        expand: () => [],
        inspector,
      } as never),
    ).toThrow(/inspector.*artifact|artifact.*inspector/i);
    expect(() =>
      defineComposite({
        namespace: 'test',
        type: 'artifactlessInspector',
        schema: schema('artifactlessInspector'),
        compile: () => ({ children: [] }),
        inspector,
      } as never),
    ).toThrow(/inspector.*artifact|artifact.*inspector/i);
  });

  it('rejects non-strict, Base-conflicting, and empty-unresolvable local options', () => {
    const define = (type: string, localOptionsInputSchema: z.ZodType, localOptionsSchema: z.ZodType) =>
      defineComposite({
        namespace: 'test',
        type,
        schema: schema(type),
        artifactSchema: z.strictObject({ value: z.number() }),
        inspector: {
          kind: 'layout',
          localOptionsInputSchema,
          localOptionsSchema,
          inspect: () => [],
        },
        compile: () => ({ children: [], artifact: { value: 1 } }),
      } as never);

    expect(() => define('passthrough', z.object({}).passthrough(), z.strictObject({}))).toThrow(/strict/i);
    expect(() =>
      define(
        'baseConflict',
        z.strictObject({ overflow: z.boolean().optional() }),
        z.strictObject({ overflow: z.boolean() }),
      ),
    ).toThrow(/overflow|base/i);
    expect(() =>
      define('emptyUnresolvable', z.strictObject({ tracks: z.boolean() }), z.strictObject({ tracks: z.boolean() })),
    ).toThrow(/empty|default|local/i);
  });
});
