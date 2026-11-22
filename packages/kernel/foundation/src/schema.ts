import type { ZodType } from 'zod';
import { enum as zodEnum, json, number, record, string, union } from 'zod';

import type { JsonValue, OpenString, ValueOf } from './types';

/** 递归 JSON 值 schema */
export const JsonValueSchema: ZodType<JsonValue, JsonValue> = json().describe(
  'Any JSON value, including nested arrays and objects.',
);

/** 字符串键 JSON 对象 schema */
export const JsonObjectSchema = record(string(), JsonValueSchema);

/** 非空白字符串 schema */
export const NonBlankStringSchema = string().regex(/\S/u, {
  message: 'String must contain at least one non-whitespace character.',
});

/**
 * 从已知 const object enum 建立保留提示的开放非空字符串 schema
 *
 * @template TValues 已知字符串值的 const object enum 类型
 * @param values 提供已知字符串值的枚举对象
 * @returns 接受已知枚举值或自定义非空白字符串的 schema
 */
export const createOpenStringSchema = <const TValues extends Readonly<Record<string, string>>>(
  values: TValues,
): ZodType<OpenString<ValueOf<TValues>>, OpenString<ValueOf<TValues>>> =>
  union([zodEnum(values), NonBlankStringSchema.min(1)]).describe(
    'Known values are suggestions, not an exhaustive list.',
  );

/** 正数 schema */
export const PositiveNumberSchema = number().positive();

/** 非负数 schema */
export const NonNegativeNumberSchema = number().nonnegative();

/** 正整数 schema */
export const PositiveIntegerSchema = number().int().positive();

/** 非负整数 schema */
export const NonNegativeIntegerSchema = number().int().nonnegative();

/** 闭区间 0..1 内的归一化数值 schema */
export const NormalizedFractionSchema = number().min(0).max(1);
