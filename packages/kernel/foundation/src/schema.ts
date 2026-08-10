import { z } from 'zod';

/** 非空白字符串 schema */
export const NonBlankStringSchema = z
  .string()
  .refine(value => value.trim().length > 0, {
    message: 'String must contain at least one non-whitespace character.',
  })
  .describe('String containing at least one non-whitespace character.');

/** 正数 schema */
export const PositiveNumberSchema = z.number().positive().describe('Finite number greater than zero.');

/** 非负数 schema */
export const NonNegativeNumberSchema = z
  .number()
  .nonnegative()
  .describe('Finite number greater than or equal to zero.');

/** 正整数 schema */
export const PositiveIntegerSchema = z.number().int().positive().describe('Positive safe integer.');

/** 非负整数 schema */
export const NonNegativeIntegerSchema = z.number().int().nonnegative().describe('Non-negative safe integer.');

/** 闭区间 0..1 内的归一化数值 schema */
export const NormalizedFractionSchema = z
  .number()
  .min(0)
  .max(1)
  .describe('Normalized fraction in the inclusive 0..1 range.');
