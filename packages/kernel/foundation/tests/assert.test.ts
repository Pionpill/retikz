import {
  assertNonEmptyString,
  NonBlankStringSchema,
  RetikzError,
  RetikzFoundationError,
  RetikzFoundationErrorCode,
} from '@retikz/foundation';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('assertNonEmptyString', () => {
  it('accepts typed non-empty content without returning a value', () => {
    expectTypeOf(assertNonEmptyString).toEqualTypeOf<(value: string, label: string) => void>();
    expect(assertNonEmptyString('alpha', 'name')).toBeUndefined();
    expect(() => assertNonEmptyString(' alpha ', 'name')).not.toThrow();
  });

  it.each(['', ' ', '\t', '\n', '\u00a0', '\u2003', '\ufeff'])('rejects blank value %j', value => {
    expect(NonBlankStringSchema.safeParse(value).success).toBe(false);
    let failure: unknown;
    try {
      assertNonEmptyString(value, 'name');
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(RetikzError);
    expect(failure).toBeInstanceOf(RetikzFoundationError);
    expect(failure).toMatchObject({
      name: 'RetikzFoundationError',
      code: RetikzFoundationErrorCode.NonEmptyStringRequired,
      message: 'name must be a non-empty string.',
      details: { label: 'name', value },
      cause: value,
    });
  });

  it('preserves the caller label in the structured error message', () => {
    expect(() => assertNonEmptyString('', 'Theme owner')).toThrowError('Theme owner must be a non-empty string.');
  });
});
