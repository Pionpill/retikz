import { assertNonEmptyString, NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('assertNonEmptyString', () => {
  it('accepts typed non-empty content without returning a value', () => {
    expectTypeOf(assertNonEmptyString).toEqualTypeOf<(value: string, label: string) => void>();
    expect(assertNonEmptyString('alpha', 'name')).toBeUndefined();
    expect(() => assertNonEmptyString(' alpha ', 'name')).not.toThrow();
  });

  it.each(['', ' ', '\t', '\n', '\u00a0', '\u2003', '\ufeff'])('rejects blank value %j', value => {
    expect(NonBlankStringSchema.safeParse(value).success).toBe(false);
    expect(() => assertNonEmptyString(value, 'name')).toThrowError('name must be a non-empty string.');
  });

  it('preserves the caller label in the ordinary Error message', () => {
    expect(() => assertNonEmptyString('', 'Theme owner')).toThrowError('Theme owner must be a non-empty string.');
  });
});
