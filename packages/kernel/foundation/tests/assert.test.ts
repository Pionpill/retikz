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

  it('throws the owner error passed for an invalid value', () => {
    const ownerError = new RetikzError({
      code: 'OWNER_INVALID',
      message: 'Owner name is invalid.',
      details: { field: 'name' },
    });

    expect(() => assertNonEmptyString('', 'Owner name', () => ownerError)).toThrowError(ownerError);
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

  it('throws the owner error passed for an invalid value', () => {
    const ownerError = new RetikzError({
      code: 'OWNER_INVALID',
      message: 'Owner size is invalid.',
      details: { field: 'size' },
    });

    expect(() => assertPositiveNumber(0, 'Owner size', () => ownerError)).toThrowError(ownerError);
  });
});

describe('领域错误工厂', () => {
  const cases = [
    {
      name: '字符串',
      valid: (factory: () => RetikzError) => assertNonEmptyString('valid', 'name', factory),
      invalid: (factory: () => RetikzError) => assertNonEmptyString(' ', 'name', factory),
    },
    {
      name: '正数',
      valid: (factory: () => RetikzError) => assertPositiveNumber(1, 'size', factory),
      invalid: (factory: () => RetikzError) => assertPositiveNumber(0, 'size', factory),
    },
  ];

  it.each(cases)('$name 成功时不调用工厂，失败时调用一次并抛出原错误', ({ valid, invalid }) => {
    let calls = 0;
    const ownerError = new RetikzError({ code: 'OWNER_INVALID', message: 'Invalid owner value', details: {} });
    const factory = () => {
      calls += 1;
      return ownerError;
    };
    expect(valid(factory)).toBeUndefined();
    expect(calls).toBe(0);
    let thrown: unknown;
    try {
      invalid(factory);
    } catch (error) {
      thrown = error;
    }
    expect(calls).toBe(1);
    expect(thrown).toBe(ownerError);
  });

  it.each(cases)('$name 原样传播工厂自身的异常', ({ invalid }) => {
    const failure = new Error('factory failed');
    let thrown: unknown;
    try {
      invalid(() => {
        throw failure;
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(failure);
  });
});
