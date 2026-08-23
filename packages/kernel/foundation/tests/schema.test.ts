import type { AssertEqual, OpenString, ValueOf } from '@retikz/foundation';

import {
  createOpenStringSchema,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const TestRole = {
  Participant: 'participant',
  Activity: 'activity',
} as const;

const TestRoleSchema = createOpenStringSchema(TestRole);
const testRoleTypeIsOpenString: AssertEqual<
  z.infer<typeof TestRoleSchema>,
  OpenString<ValueOf<typeof TestRole>>
> = true;

describe('NonBlankStringSchema', () => {
  it('preserves non-blank input verbatim', () => {
    expect(NonBlankStringSchema.parse(' alpha ')).toBe(' alpha ');
  });

  it.each(['', ' ', '\t', '\n', '\u00a0', '\u2003', '\ufeff'])('rejects blank value %j', value => {
    expect(NonBlankStringSchema.safeParse(value).success).toBe(false);
  });
});

describe('createOpenStringSchema', () => {
  it('preserves built-in and custom non-blank strings with an OpenString result type', () => {
    expect(testRoleTypeIsOpenString).toBe(true);
    expect(TestRoleSchema.parse(TestRole.Participant)).toBe(TestRole.Participant);
    expect(TestRoleSchema.parse(' custom.role ')).toBe(' custom.role ');
  });

  it.each(['', ' ', '\t', '\n', '\u00a0', '\u2003', '\ufeff'])('rejects blank value %j', value => {
    expect(TestRoleSchema.safeParse(value).success).toBe(false);
  });

  it('keeps built-in enum hints and an open non-empty string branch in JSON Schema', () => {
    expect(z.toJSONSchema(TestRoleSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: ['participant', 'activity'] },
        { type: 'string', minLength: 1 },
      ],
    });
  });
});

describe('number schemas', () => {
  it.each([Number.NEGATIVE_INFINITY, -1, -0, 0, Number.POSITIVE_INFINITY, Number.NaN, '1'])(
    'PositiveNumberSchema rejects %j',
    value => {
      expect(PositiveNumberSchema.safeParse(value).success).toBe(false);
    },
  );

  it('PositiveNumberSchema accepts finite positive numbers', () => {
    expect(PositiveNumberSchema.parse(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);
    expect(PositiveNumberSchema.parse(1.5)).toBe(1.5);
  });

  it.each([-0, 0, 1.5])('NonNegativeNumberSchema accepts %j', value => {
    expect(NonNegativeNumberSchema.parse(value)).toBe(value);
  });

  it.each([Number.NEGATIVE_INFINITY, -1, Number.POSITIVE_INFINITY, Number.NaN])(
    'NonNegativeNumberSchema rejects %j',
    value => {
      expect(NonNegativeNumberSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each([1, Number.MAX_SAFE_INTEGER])('PositiveIntegerSchema accepts %j', value => {
    expect(PositiveIntegerSchema.parse(value)).toBe(value);
  });

  it.each([-1, -0, 0, 1.5, Number.MAX_SAFE_INTEGER + 1])('PositiveIntegerSchema rejects %j', value => {
    expect(PositiveIntegerSchema.safeParse(value).success).toBe(false);
  });

  it.each([-0, 0, 1, Number.MAX_SAFE_INTEGER])('NonNegativeIntegerSchema accepts %j', value => {
    expect(NonNegativeIntegerSchema.parse(value)).toBe(value);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('NonNegativeIntegerSchema rejects %j', value => {
    expect(NonNegativeIntegerSchema.safeParse(value).success).toBe(false);
  });

  it.each([0, 0.5, 1])('NormalizedFractionSchema accepts %j', value => {
    expect(NormalizedFractionSchema.parse(value)).toBe(value);
  });

  it.each([Number.NEGATIVE_INFINITY, -0.1, 1.1, Number.POSITIVE_INFINITY, Number.NaN])(
    'NormalizedFractionSchema rejects %j',
    value => {
      expect(NormalizedFractionSchema.safeParse(value).success).toBe(false);
    },
  );
});
