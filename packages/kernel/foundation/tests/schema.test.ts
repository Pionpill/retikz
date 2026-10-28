import type { JsonObject } from '@retikz/foundation';
import {
  createOpenStringSchema,
  JsonObjectSchema,
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

const TestRole = {
  Participant: 'participant',
  Activity: 'activity',
} as const;

const TestRoleSchema = createOpenStringSchema(TestRole);

describe('JSON 数据 schema', () => {
  it('接受递归 JSON 值和对象', () => {
    const object: JsonObject = {
      scalar: 'value',
      list: [1, true, null, { nested: ['deep'] }],
    };

    expect(JsonValueSchema.parse(object)).toEqual(object);
    expect(JsonObjectSchema.parse(object)).toEqual(object);
    expect(JsonObjectSchema.parse({})).toEqual({});
  });

  it('在未知解析边界处接受只读 const JSON', () => {
    const source = { list: [1, { nested: ['value'] }] } as const;

    expect(JsonObjectSchema.parse(source)).toEqual(source);
  });

  it.each([
    { invalid: undefined },
    { invalid: () => 1 },
    { invalid: Symbol('value') },
    { invalid: 1n },
    { invalid: Number.NaN },
    { invalid: Number.POSITIVE_INFINITY },
    { nested: [0, { invalid: undefined }] },
    { invalid: new Date(0) },
    { invalid: new Map([['key', 'value']]) },
  ])('拒绝非 JSON 输入 %#', value => {
    expect(JsonObjectSchema.safeParse(value).success).toBe(false);
  });

  it('往返持续 JSON 而不改变其值', () => {
    const original: JsonObject = {
      coefficient: 2.5,
      labels: ['p', 'q'],
      nested: { samples: 8, values: [1, 2, 3], enabled: false, empty: null },
    };

    expect(JsonObjectSchema.parse(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });

  it('仍然可转换为 JSON schema', () => {
    expect(toJSONSchema(JsonValueSchema)).toMatchObject({
      $ref: '#/$defs/__schema0',
      $defs: {
        __schema0: { anyOf: expect.any(Array) },
      },
    });
  });
});

describe('NonBlankStringSchema', () => {
  it('逐字保留非空白输入', () => {
    expect(NonBlankStringSchema.parse(' alpha ')).toBe(' alpha ');
  });

  it.each(['', ' ', '\t', '\n', '\u00a0', '\u2003', '\ufeff'])('拒绝空白值 %j', value => {
    expect(NonBlankStringSchema.safeParse(value).success).toBe(false);
  });
});

describe('createOpenStringSchema', () => {
  it('保留具有 OpenString 结果类型的内置和自定义非空白字符串', () => {
    expect(TestRoleSchema.parse(TestRole.Participant)).toBe(TestRole.Participant);
    expect(TestRoleSchema.parse(' custom.role ')).toBe(' custom.role ');
  });

  it.each(['', ' ', '\t', '\n', '\u00a0', '\u2003', '\ufeff'])('拒绝空白值 %j', value => {
    expect(TestRoleSchema.safeParse(value).success).toBe(false);
  });

  it('在 JSON schema 中保留内置枚举提示和开放的非空字符串分支', () => {
    expect(toJSONSchema(TestRoleSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: ['participant', 'activity'] },
        { type: 'string', minLength: 1 },
      ],
    });
  });
});

describe('数字 schema', () => {
  it.each([Number.NEGATIVE_INFINITY, -1, -0, 0, Number.POSITIVE_INFINITY, Number.NaN, '1'])(
    'PositiveNumberSchema 拒绝 %j',
    value => {
      expect(PositiveNumberSchema.safeParse(value).success).toBe(false);
    },
  );

  it('PositiveNumberSchema 接受有限正数', () => {
    expect(PositiveNumberSchema.parse(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);
    expect(PositiveNumberSchema.parse(1.5)).toBe(1.5);
  });

  it.each([-0, 0, 1.5])('NonNegativeNumberSchema 接受 %j', value => {
    expect(NonNegativeNumberSchema.parse(value)).toBe(value);
  });

  it.each([Number.NEGATIVE_INFINITY, -1, Number.POSITIVE_INFINITY, Number.NaN])(
    'NonNegativeNumberSchema 拒绝 %j',
    value => {
      expect(NonNegativeNumberSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each([1, Number.MAX_SAFE_INTEGER])('PositiveIntegerSchema 接受 %j', value => {
    expect(PositiveIntegerSchema.parse(value)).toBe(value);
  });

  it.each([-1, -0, 0, 1.5, Number.MAX_SAFE_INTEGER + 1])('PositiveIntegerSchema 拒绝 %j', value => {
    expect(PositiveIntegerSchema.safeParse(value).success).toBe(false);
  });

  it.each([-0, 0, 1, Number.MAX_SAFE_INTEGER])('NonNegativeIntegerSchema 接受 %j', value => {
    expect(NonNegativeIntegerSchema.parse(value)).toBe(value);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('NonNegativeIntegerSchema 拒绝 %j', value => {
    expect(NonNegativeIntegerSchema.safeParse(value).success).toBe(false);
  });

  it.each([0, 0.5, 1])('NormalizedFractionSchema 接受 %j', value => {
    expect(NormalizedFractionSchema.parse(value)).toBe(value);
  });

  it.each([Number.NEGATIVE_INFINITY, -0.1, 1.1, Number.POSITIVE_INFINITY, Number.NaN])(
    'NormalizedFractionSchema 拒绝 %j',
    value => {
      expect(NormalizedFractionSchema.safeParse(value).success).toBe(false);
    },
  );
});
