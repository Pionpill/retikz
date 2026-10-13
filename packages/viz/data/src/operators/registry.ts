import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject } from 'zod';

import { RetikzDataError } from '../error';

/**
 * 从统计子算子定义 schema 中提取注册键
 * @description reducer 与 row selector 都以 `kind` 作为 registry discriminator；schema 必须把它声明成非空字面量
 * @param schema 注册定义的对象 schema，kind 必须是非空字符串字面量
 * @returns kind 字面量的字符串值
 * @throws {RetikzDataError} schema 不是对象或 kind 不是有效字面量
 */
export const extractStatisticOperation = (schema: ZodType): string => {
  if (!(schema instanceof ZodObject)) {
    throw new RetikzDataError('data: statistic registration schema must be a ZodObject with a literal kind field');
  }

  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new RetikzDataError('data: statistic registration schema must declare kind as a non-empty z.literal string');
  }

  return kindSchema.value;
};
