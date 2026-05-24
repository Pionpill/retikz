import { describe, expect, it } from 'vitest';
import { JsonObjectSchema, JsonValueSchema } from '../../src/ir';
import type { IRJsonObject } from '../../src/ir';

describe('JsonObjectSchema 接受合法 JSON', () => {
  it('接受字符串 / 有限数字 / 布尔 / null 标量值', () => {
    const obj = { s: 'x', n: 1.5, b: true, z: null };
    expect(JsonObjectSchema.parse(obj)).toEqual(obj);
  });

  it('接受数组值（含混合标量）', () => {
    const obj = { list: [1, 'a', true, null] };
    expect(JsonObjectSchema.parse(obj)).toEqual(obj);
  });

  it('接受深层嵌套对象 + 数组（递归 JSON 值）', () => {
    const obj = {
      a: { b: { c: [1, { d: 'deep', e: [true, null, { f: 2 }] }] } },
    };
    expect(JsonObjectSchema.parse(obj)).toEqual(obj);
  });

  it('接受空对象', () => {
    expect(JsonObjectSchema.parse({})).toEqual({});
  });

  it('JsonValueSchema 直接接受顶层数组 / 标量（值层 schema）', () => {
    expect(JsonValueSchema.parse([1, 2, 3])).toEqual([1, 2, 3]);
    expect(JsonValueSchema.parse('hello')).toBe('hello');
    expect(JsonValueSchema.parse(null)).toBe(null);
  });
});

describe('JsonObjectSchema 拒绝非 JSON 值', () => {
  it('拒绝含 function 的值', () => {
    expect(JsonObjectSchema.safeParse({ fn: () => 1 }).success).toBe(false);
  });

  it('拒绝含 undefined 的值', () => {
    expect(JsonObjectSchema.safeParse({ u: undefined }).success).toBe(false);
  });

  it('拒绝含 Symbol 的值', () => {
    expect(JsonObjectSchema.safeParse({ s: Symbol('x') }).success).toBe(false);
  });

  it('拒绝嵌套数组里藏的 function（递归拦截）', () => {
    expect(JsonObjectSchema.safeParse({ list: [1, () => 2] }).success).toBe(false);
  });

  it('拒绝嵌套对象里藏的 undefined（递归拦截）', () => {
    expect(JsonObjectSchema.safeParse({ a: { b: undefined } }).success).toBe(false);
  });

  it('拒绝非有限数 NaN（避免 JSON round-trip 失真为 null）', () => {
    expect(JsonObjectSchema.safeParse({ n: Number.NaN }).success).toBe(false);
  });
});

describe('JsonObjectSchema 深递归 JSON round-trip 保真', () => {
  it('深层嵌套对象 JSON.parse(JSON.stringify()) 后仍通过 parse 且语义等价', () => {
    const original: IRJsonObject = {
      coeff: 2.5,
      labels: ['p', 'q'],
      nested: { samples: 8, sub: { values: [1, 2, 3], flag: false, none: null } },
    };
    const roundTripped = JSON.parse(JSON.stringify(original));
    const parsed = JsonObjectSchema.parse(roundTripped);
    expect(parsed).toEqual(original);
  });
});
