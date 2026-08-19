import {
  assertNonEmptyString,
  assertPositiveNumber,
  NonBlankStringSchema,
  PositiveNumberSchema,
  RetikzError,
  RetikzFoundationError,
  RetikzFoundationErrorCode,
} from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('assertNonEmptyString', () => {
  it('accepts typed non-empty content without returning a value', () => {
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

describe('assertPositiveNumber', () => {
  it('accepts positive finite numbers without returning a value', () => {
    expect(assertPositiveNumber(Number.MIN_VALUE, 'size')).toBeUndefined();
    expect(assertPositiveNumber(1.5, 'size')).toBeUndefined();
    expect(PositiveNumberSchema.safeParse(1.5).success).toBe(true);
  });

  it.each([-Infinity, -1, -0, 0, Infinity, NaN])('rejects non-positive or non-finite value %j', value => {
    expect(PositiveNumberSchema.safeParse(value).success).toBe(false);
    let failure: unknown;
    try {
      assertPositiveNumber(value, 'size');
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(RetikzError);
    expect(failure).toBeInstanceOf(RetikzFoundationError);
    expect(failure).toMatchObject({
      name: 'RetikzFoundationError',
      code: RetikzFoundationErrorCode.PositiveNumberRequired,
      message: 'size must be a positive finite number.',
      details: { label: 'size', value },
      cause: value,
    });
  });

  it('preserves the caller label in the structured error message', () => {
    expect(() => assertPositiveNumber(0, 'SVG font size')).toThrowError(
      'SVG font size must be a positive finite number.',
    );
  });
});
