import type { AssertEqual, OpenString, RetikzErrorOptions, ValueOf } from '@retikz/foundation';

import * as foundation from '@retikz/foundation';
import { assertNonEmptyString, isRetikzError, RetikzError } from '@retikz/foundation';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('foundation public surface', () => {
  it('exports only the three runtime symbols from its root', () => {
    expect(Object.keys(foundation).sort()).toEqual(['RetikzError', 'assertNonEmptyString', 'isRetikzError'].sort());
    expectTypeOf(assertNonEmptyString).toBeFunction();
    expectTypeOf(RetikzError).toBeConstructibleWith({ code: 'CODE', message: 'message', details: {} });
    expectTypeOf(isRetikzError).toBeFunction();
  });

  it('keeps the four type exports available only at the root', () => {
    expectTypeOf<ValueOf<{ Alpha: 'a' }>>().toEqualTypeOf<'a'>();
    expectTypeOf<AssertEqual<'a', 'a'>>().toEqualTypeOf<true>();
    const custom: OpenString<'a'> = 'custom';
    expectTypeOf(custom).toBeString();
    expectTypeOf<RetikzErrorOptions<'CODE', Readonly<Record<string, unknown>>>>().toHaveProperty('cause');
  });

  it.each(['types', 'assert', 'error'])('rejects the %s subpath', async subpath => {
    await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
  });
});
