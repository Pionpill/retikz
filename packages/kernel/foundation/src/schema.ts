import type { ZodType } from 'zod';

import { enum as zodEnum, number, string, union } from 'zod';

import type { OpenString, ValueOf } from './types';

/** 非空白字符串 schema */
export const NonBlankStringSchema = string()
  .refine(value => value.trim().length > 0, {
    message: 'String must contain at least one non-whitespace character.',
  })
  .describe('String containing at least one non-whitespace character.');

/** 从已知 const object enum 建立保留提示的开放非空字符串 schema */
export const createOpenStringSchema = <const TValues extends Readonly<Record<string, string>>>(
  values: TValues,
): ZodType<OpenString<ValueOf<TValues>>> =>
  union([zodEnum(values), NonBlankStringSchema.min(1)]).describe(
    'Known string values or any custom string containing at least one non-whitespace character.',
  );

/** 正数 schema */
export const PositiveNumberSchema = number().positive().describe('Finite number greater than zero.');

/** 非负数 schema */
export const NonNegativeNumberSchema = number().nonnegative().describe('Finite number greater than or equal to zero.');

/** 正整数 schema */
export const PositiveIntegerSchema = number().int().positive().describe('Positive safe integer.');

/** 非负整数 schema */
export const NonNegativeIntegerSchema = number().int().nonnegative().describe('Non-negative safe integer.');

/** 闭区间 0..1 内的归一化数值 schema */
export const NormalizedFractionSchema = number()
  .min(0)
  .max(1)
  .describe('Normalized fraction in the inclusive 0..1 range.');
