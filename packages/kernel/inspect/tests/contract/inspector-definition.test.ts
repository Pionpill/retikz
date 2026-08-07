import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { InspectorDefinition } from '../../src';

import { defineInspector } from '../../src';

describe('Inspector definition', () => {
  it('preserves the frozen independent owner and option contracts', () => {
    const definition = defineInspector({
      namespace: 'test',
      name: 'bounds',
      owner: { kind: 'composite', namespace: 'demo', type: 'box' },
      subjectSchema: z.strictObject({ width: z.number() }),
      optionsInputSchema: z.strictObject({ color: z.string().optional() }),
      optionsSchema: z
        .strictObject({ color: z.string().optional() })
        .transform(value => ({ color: value.color ?? '#000000' })),
      inspect: () => [],
    });

    expect(definition).toMatchObject({ namespace: 'test', name: 'bounds' });
    expect(Object.isFrozen(definition)).toBe(true);
    expectTypeOf(definition).toMatchTypeOf<
      InspectorDefinition<{ width: number }, { color?: string }, { color: string }>
    >();
  });

  it.each(['namespace', 'name'] as const)('rejects an empty %s', field => {
    expect(() =>
      defineInspector({
        namespace: field === 'namespace' ? ' ' : 'test',
        name: field === 'name' ? '' : 'bounds',
        owner: { kind: 'pathKind', name: 'stroke' },
        subjectSchema: z.null(),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => [],
      }),
    ).toThrow(new RegExp(field, 'i'));
  });

  it.each([
    ['owner', { owner: { kind: 'pathKind', name: '' } }],
    ['subject schema', { subjectSchema: {} }],
    ['options input schema', { optionsInputSchema: {} }],
    ['options schema', { optionsSchema: {} }],
    ['merge callback', { mergeOptionsInput: true }],
    ['inspect callback', { inspect: null }],
  ] as const)('rejects an invalid %s at definition time', (_label, override) => {
    expect(() =>
      defineInspector({
        namespace: 'test',
        name: 'invalid',
        owner: { kind: 'pathKind', name: 'stroke' },
        subjectSchema: z.null(),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => [],
        ...override,
      } as never),
    ).toThrow();
  });
});
