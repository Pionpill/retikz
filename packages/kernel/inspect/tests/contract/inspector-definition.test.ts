import { RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { InspectorDefinition } from '../../src';

import { defineInspector } from '../../src';

const expectFoundationNonEmptyError = (action: () => unknown, label: string, value: string): void => {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RetikzFoundationError);
  expect(caught).toMatchObject({
    code: RetikzFoundationErrorCode.NonEmptyStringRequired,
    message: `${label} must be a non-empty string.`,
    details: { label, value },
    cause: value,
  });
};

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

  it.each([
    ['namespace', ' '],
    ['name', '\u2003'],
  ] as const)('rejects a blank %s with the established error text', (field, value) => {
    const label = `Inspector ${field}`;
    expectFoundationNonEmptyError(
      () =>
        defineInspector({
          namespace: field === 'namespace' ? value : 'test',
          name: field === 'name' ? value : 'bounds',
          owner: { kind: 'pathKind', name: 'stroke' },
          subjectSchema: z.null(),
          optionsInputSchema: z.strictObject({}),
          optionsSchema: z.strictObject({}),
          inspect: () => [],
        }),
      label,
      value,
    );
  });

  it.each([
    ['pathKind name', 'Inspector owner name', '\ufeff', { kind: 'pathKind', name: '\ufeff' }],
    ['composite namespace', 'Inspector owner namespace', ' ', { kind: 'composite', namespace: ' ', type: 'box' }],
    ['composite type', 'Inspector owner type', '\u2003', { kind: 'composite', namespace: 'demo', type: '\u2003' }],
  ] as const)(
    'rejects a blank %s owner field without reading unknown values as strings',
    (_field, label, value, owner) => {
      expectFoundationNonEmptyError(
        () =>
          defineInspector({
            namespace: 'test',
            name: 'invalid-owner',
            owner,
            subjectSchema: z.null(),
            optionsInputSchema: z.strictObject({}),
            optionsSchema: z.strictObject({}),
            inspect: () => [],
          }),
        label,
        value,
      );
    },
  );

  it.each([null, 1] as const)('rejects malformed unknown definition input %j', input => {
    expect(() => defineInspector(input as never)).toThrowError('Inspector definition must be an object');
  });

  it('rejects an object missing the definition fields through the namespace boundary', () => {
    expect(() => defineInspector({} as never)).toThrowError('Inspector namespace must be a non-empty string');
  });

  it.each([
    ['owner', { owner: { kind: 'pathKind', name: '' } }],
    ['owner object field', { owner: { kind: 'pathKind', name: {} } }],
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
