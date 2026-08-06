import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { AnyCompositeDefinition } from '../../src';

import { CompositeBaseSchema, defineComposite, defineInspector } from '../../src';

const schema = (type: string) =>
  CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal(type),
  });

describe('composite inspector definition', () => {
  it('preserves exact artifact and resolved option callback types', () => {
    const optionsInput = z.strictObject({ tracks: z.boolean().optional() });
    const optionsSchema = optionsInput.transform(value => ({ tracks: value.tracks ?? true }));
    const inspector = defineInspector({
      kind: 'composite',
      optionsInputSchema: optionsInput,
      optionsSchema,
      inspect: (artifact: { value: number }, context) => {
        expectTypeOf(artifact.value).toEqualTypeOf<number>();
        expectTypeOf(context.options.tracks).toEqualTypeOf<boolean>();
        return [];
      },
    });
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

  it('rejects Inspector branches without a compile artifact', () => {
    const inspector = defineInspector({
      kind: 'composite',
      optionsInputSchema: z.strictObject({}),
      optionsSchema: z.strictObject({}),
      inspect: () => [],
    });
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
});
